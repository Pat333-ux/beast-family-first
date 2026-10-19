const express = require('express');
const { evaluateIntake } = require('../engine/scoringEngine');
const { encryptIntake } = require('../security/intakeEncryption');
const { writeAudit } = require('./audit');

const ALLOWED_NEEDS = new Set([
  'housing',
  'food',
  'trauma_prevention',
  'domestic_safety',
  'mental_health',
]);

function validateIntake(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return 'A valid intake application is required';
  }
  if (typeof body.fullName !== 'string' || !body.fullName.trim() || body.fullName.trim().length > 255) {
    return 'A valid full name is required';
  }
  if (
    typeof body.email !== 'string' ||
    body.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())
  ) {
    return 'A valid email address is required';
  }
  if (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.length > 40)) {
    return 'A valid phone number is required';
  }
  if (typeof body.county !== 'string' || !body.county.trim() || body.county.trim().length > 100) {
    return 'A valid county is required';
  }
  if (!Number.isInteger(body.dependentsCount) || body.dependentsCount < 0 || body.dependentsCount > 50) {
    return 'Children in household must be a whole number from 0 to 50';
  }
  if (
    !Array.isArray(body.needs) ||
    body.needs.length > ALLOWED_NEEDS.size ||
    body.needs.some((need) => !ALLOWED_NEEDS.has(need)) ||
    new Set(body.needs).size !== body.needs.length
  ) {
    return 'Select valid support needs';
  }
  return null;
}

function createIntakeRouter({ pool, encryptionKey = process.env.INTAKE_ENCRYPTION_KEY } = {}) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('A PostgreSQL pool is required');
  }

  const router = express.Router();
  router.post('/', async (req, res) => {
    const validationError = validateIntake(req.body);
    if (validationError) return res.status(400).json({ error: validationError });

    let encrypted;
    try {
      const { fullName, email, phone, county, dependentsCount, needs } = req.body;
      encrypted = encryptIntake({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: typeof phone === 'string' ? phone.trim() : '',
        county: county.trim(),
        dependentsCount,
        needs,
      }, encryptionKey);
    } catch (error) {
      if (error.message.includes('INTAKE_ENCRYPTION_KEY')) {
        return res.status(503).json({ error: 'Intake service is not configured for secure storage.' });
      }
      return res.status(500).json({ error: 'Unable to secure intake information.' });
    }

    const assessment = evaluateIntake({
      dependentsCount: req.body.dependentsCount,
      housingStatus: req.body.needs.includes('housing') ? 'at_risk' : 'housed',
      domesticViolenceFlag: req.body.needs.includes('domestic_safety'),
      mentalHealthCrisisFlag: req.body.needs.includes('mental_health'),
      foodInsecure: req.body.needs.includes('food'),
    });
    if (req.body.needs.includes('trauma_prevention')) {
      assessment.suggestedPathways.push('TRAUMA_PREVENTION_PATHWAY');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `INSERT INTO intake_requests
           (tracking_id, encrypted_payload, encryption_iv, encryption_tag,
            risk_score, priority, assessment)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, tracking_id, status`,
        [
          `INT-${new Date().getFullYear()}-${assessment.assessmentId.replaceAll('-', '').slice(0, 8).toUpperCase()}`,
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.tag,
          assessment.calculatedScore,
          assessment.priorityLevel,
          JSON.stringify(assessment),
        ]
      );
      const intake = result.rows[0];
      await writeAudit(client, {
        action: 'INTAKE_SUBMITTED',
        targetType: 'INTAKE',
        targetId: intake.id,
        ipAddress: req.ip,
        metadata: { priority: assessment.priorityLevel },
      });
      await client.query('COMMIT');

      return res.status(201).json({
        case: {
          id: intake.id,
          trackingId: intake.tracking_id,
          status: intake.status.toLowerCase(),
          assessment: {
            score: assessment.calculatedScore,
            priority: assessment.priorityLevel,
            riskFactors: assessment.riskFactors,
            suggestedPathways: assessment.suggestedPathways,
            requiresHumanReview: true,
          },
        },
      });
    } catch {
      await client.query('ROLLBACK');
      return res.status(500).json({ error: 'Unable to submit intake application.' });
    } finally {
      client.release();
    }
  });

  return router;
}

module.exports = { createIntakeRouter, validateIntake };
