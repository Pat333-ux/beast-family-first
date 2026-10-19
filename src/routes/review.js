const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { sendWebhook } = require('../engine/routingEngine');
const { decryptIntake } = require('../security/intakeEncryption');
const { writeAudit } = require('./audit');

const REVIEW_ROLES = ['Caseworker', 'Supervisor', 'Administrator'];
const PATHWAY_CATEGORIES = {
  HOUSING_STABILIZATION_GRANT: 'housing',
  TRAUMA_PREVENTION_PATHWAY: 'family_support',
  COMMUNITY_FOOD_NETWORK: 'food',
  COUNSELING_NAVIGATION: 'mental_health',
};
const CASE_ID_PATTERN = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|INT-\d{4}-[A-F0-9]{8})$/i;

function readPathwaySavings(value = process.env.PATHWAY_SAVINGS_CENTS) {
  if (!value) return {};
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('PATHWAY_SAVINGS_CENTS must be valid JSON');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('PATHWAY_SAVINGS_CENTS must be a JSON object');
  }
  for (const [pathway, amount] of Object.entries(parsed)) {
    if (!PATHWAY_CATEGORIES[pathway] || !Number.isSafeInteger(amount) || amount < 0) {
      throw new Error('PATHWAY_SAVINGS_CENTS contains an invalid pathway estimate');
    }
  }
  return parsed;
}

function createReviewRouter({
  pool,
  jwtSecret = process.env.JWT_SECRET,
  encryptionKey = process.env.INTAKE_ENCRYPTION_KEY,
  webhookUrl = process.env.COMMUNITY_PARTNER_WEBHOOK_URL,
  webhookSecret = process.env.WEBHOOK_SECRET,
  savings = readPathwaySavings(),
  dispatchWebhook = sendWebhook,
} = {}) {
  if (!pool || typeof pool.connect !== 'function' || typeof pool.query !== 'function') {
    throw new TypeError('A PostgreSQL pool is required');
  }
  const router = express.Router();
  router.use(authenticateToken(jwtSecret), authorizeRoles(...REVIEW_ROLES));

  router.get('/queue', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, tracking_id, status, risk_score, priority, assessment,
                encrypted_payload, encryption_iv, encryption_tag, created_at
           FROM intake_requests
          WHERE status = 'PENDING_REVIEW'
          ORDER BY CASE priority
                     WHEN 'EMERGENCY' THEN 0
                     WHEN 'URGENT' THEN 1
                     ELSE 2
                   END ASC,
                   risk_score DESC,
                   created_at ASC`
      );
      const cases = result.rows.map((row) => {
        const applicant = decryptIntake({
          ciphertext: row.encrypted_payload,
          iv: row.encryption_iv,
          tag: row.encryption_tag,
        }, encryptionKey);
        return {
          id: row.id,
          trackingId: row.tracking_id,
          status: row.status.toLowerCase(),
          priority: row.priority,
          riskScore: row.risk_score,
          assessment: row.assessment,
          fullName: applicant.fullName,
          email: applicant.email,
          phone: applicant.phone,
          county: applicant.county,
          dependentsCount: applicant.dependentsCount,
          needs: applicant.needs,
          createdAt: row.created_at,
        };
      });

      await pool.query(
        `INSERT INTO system_audit_logs (user_id, action, target_type, ip_address, metadata)
         VALUES ($1, 'REVIEW_QUEUE_ACCESSED', 'REVIEW_QUEUE', $2, $3)`,
        [req.user.sub, req.ip, JSON.stringify({ count: cases.length })]
      );
      return res.json({ cases });
    } catch {
      return res.status(500).json({ error: 'Unable to load the case review queue.' });
    }
  });

  async function recordWebhookResult({ caseId, userId, ipAddress, pathways, status }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (pathways.length && status !== 'not_configured') {
        await client.query(
          `UPDATE resource_assignments
              SET status = $1
            WHERE intake_id = $2`,
          [status === 'dispatched' ? 'DISPATCHED' : 'FAILED', caseId]
        );
      }
      await writeAudit(client, {
        userId,
        action: status === 'dispatched'
          ? 'ROUTING_WEBHOOK_DISPATCHED'
          : status === 'not_configured'
            ? 'ROUTING_WEBHOOK_NOT_CONFIGURED'
            : 'ROUTING_WEBHOOK_FAILED',
        targetType: 'INTAKE',
        targetId: caseId,
        ipAddress,
        metadata: { pathwayCount: pathways.length, status },
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  async function decide(req, res, decision) {
    const { caseId, notes = '', pathways = [] } = req.body || {};
    if (typeof caseId !== 'string' || !CASE_ID_PATTERN.test(caseId)) {
      return res.status(400).json({ error: 'A valid case ID is required.' });
    }
    if (typeof notes !== 'string' || notes.length > 2000) {
      return res.status(400).json({ error: 'Review notes must be 2,000 characters or fewer.' });
    }
    if (decision === 'DENIED' && !notes.trim()) {
      return res.status(400).json({ error: 'A reason is required to deny an application.' });
    }
    if (
      !Array.isArray(pathways) ||
      pathways.length > Object.keys(PATHWAY_CATEGORIES).length ||
      pathways.some((pathway) => !PATHWAY_CATEGORIES[pathway]) ||
      new Set(pathways).size !== pathways.length
    ) {
      return res.status(400).json({ error: 'Select valid, unique resource pathways.' });
    }

    const client = await pool.connect();
    let intake;
    try {
      await client.query('BEGIN');
      const result = await client.query(
        `SELECT id, tracking_id, status, priority, risk_score, assessment
           FROM intake_requests
          WHERE id::text = $1 OR tracking_id = $1
          FOR UPDATE`,
        [caseId]
      );
      intake = result.rows[0];
      if (!intake) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Case not found.' });
      }
      if (intake.status !== 'PENDING_REVIEW') {
        await client.query('ROLLBACK');
        return res.status(409).json({ error: 'This case has already been reviewed.' });
      }

      await client.query(
        `UPDATE intake_requests
            SET status = $1, reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $2
          WHERE id = $3`,
        [decision, req.user.sub, intake.id]
      );
      await client.query(
        `INSERT INTO case_reviews (intake_id, reviewer_id, decision, notes, pathways)
         VALUES ($1, $2, $3, $4, $5)`,
        [intake.id, req.user.sub, decision, notes.trim(), decision === 'APPROVED' ? pathways : []]
      );

      if (decision === 'APPROVED') {
        for (const pathway of pathways) {
          await client.query(
            `INSERT INTO resource_assignments
               (intake_id, pathway, category, estimated_savings_cents)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (intake_id, pathway) DO NOTHING`,
            [intake.id, pathway, PATHWAY_CATEGORIES[pathway], savings[pathway] || 0]
          );
        }
      }

      await writeAudit(client, {
        userId: req.user.sub,
        action: decision === 'APPROVED' ? 'CASE_APPROVED' : 'CASE_DENIED',
        targetType: 'INTAKE',
        targetId: intake.id,
        ipAddress: req.ip,
        metadata: { decision, pathwayCount: decision === 'APPROVED' ? pathways.length : 0 },
      });
      await client.query('COMMIT');
    } catch {
      await client.query('ROLLBACK').catch(() => {});
      return res.status(500).json({ error: 'Unable to save the case review.' });
    } finally {
      client.release();
    }

    let routingStatus = 'not_applicable';
    if (decision === 'APPROVED') {
      if (!webhookUrl || !webhookSecret) {
        routingStatus = 'not_configured';
      } else {
        try {
          await dispatchWebhook(webhookUrl, {
            event: 'case.approved',
            caseId: intake.id,
            trackingId: intake.tracking_id,
            priority: intake.priority,
            pathways,
          }, { secret: webhookSecret });
          routingStatus = 'dispatched';
        } catch {
          routingStatus = 'failed';
        }
      }

      try {
        await recordWebhookResult({
          caseId: intake.id,
          userId: req.user.sub,
          ipAddress: req.ip,
          pathways,
          status: routingStatus,
        });
      } catch {
        routingStatus = 'audit_failed';
      }
    }

    return res.json({
      case: {
        id: intake.id,
        trackingId: intake.tracking_id,
        status: decision.toLowerCase(),
        assessment: {
          score: intake.risk_score,
          priority: intake.priority,
          ...(intake.assessment?.riskFactors ? { riskFactors: intake.assessment.riskFactors } : {}),
        },
      },
      routing: { status: routingStatus },
    });
  }

  router.post('/approve', (req, res) => decide(req, res, 'APPROVED'));
  router.post('/deny', (req, res) => decide(req, res, 'DENIED'));
  return router;
}

module.exports = {
  createReviewRouter,
  PATHWAY_CATEGORIES,
  readPathwaySavings,
};
