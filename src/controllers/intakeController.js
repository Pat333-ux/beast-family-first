const crypto = require('crypto');
const db = require('../../db');
const { evaluateIntake } = require('../engine/scoringEngine');

const HOUSING = ['housed', 'at_risk', 'homeless'];

// AES-256-GCM field-level encryption; key = 32 bytes hex in FIELD_ENCRYPTION_KEY.
function encryptField(obj) {
  const hex = process.env.FIELD_ENCRYPTION_KEY || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) throw new Error('FIELD_ENCRYPTION_KEY must be 64 hex chars');
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', Buffer.from(hex, 'hex'), iv);
  const enc = Buffer.concat([c.update(JSON.stringify(obj), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64')).join('.');
}

function validate(body) {
  const b = body || {};
  if (!HOUSING.includes(b.housingStatus)) return 'housingStatus must be one of ' + HOUSING.join(', ');
  if (b.dependentsCount !== undefined && (!Number.isInteger(b.dependentsCount) || b.dependentsCount < 0 || b.dependentsCount > 50)) {
    return 'dependentsCount must be an integer 0-50';
  }
  for (const f of ['domesticViolenceFlag', 'mentalHealthCrisisFlag', 'substanceSupportFlag', 'foodInsecure']) {
    if (b[f] !== undefined && typeof b[f] !== 'boolean') return `${f} must be boolean`;
  }
  return null;
}

async function createIntake(req, res, next) {
  try {
    const err = validate(req.body);
    if (err) return res.status(400).json({ error: err });
    const b = req.body;
    const result = evaluateIntake({
      familyId: b.familyId,
      dependentsCount: b.dependentsCount,
      housingStatus: b.housingStatus,
      domesticViolenceFlag: b.domesticViolenceFlag,
      mentalHealthCrisisFlag: b.mentalHealthCrisisFlag,
      substanceSupportFlag: b.substanceSupportFlag,
      foodInsecure: b.foodInsecure
    });
    const encrypted = encryptField(b);
    const client = await db.getPool().connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO intake_requests (id, family_id, status, priority_level, priority_score, risk_factors, suggested_pathways, encrypted_payload)
         VALUES ($1,$2,'submitted',$3,$4,$5,$6,$7)`,
        [result.assessmentId, b.familyId || null, result.priorityLevel, result.calculatedScore,
          JSON.stringify(result.riskFactors), JSON.stringify(result.suggestedPathways), encrypted]
      );
      await client.query(
        `INSERT INTO system_audit_logs (user_id, action, target_type, target_id, ip_address, metadata)
         VALUES ($1,'INTAKE_SUBMITTED','intake_request',$2,$3,$4)`,
        [req.user.id, result.assessmentId, req.ip, JSON.stringify({ priority: result.priorityLevel, score: result.calculatedScore })]
      );
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return res.status(201).json({
      intakeId: result.assessmentId,
      status: 'submitted',
      priorityLevel: result.priorityLevel,
      calculatedScore: result.calculatedScore,
      riskFactors: result.riskFactors,
      suggestedPathways: result.suggestedPathways,
      requiresHumanReview: true
    });
  } catch (e) {
    return next(e);
  }
}

module.exports = { createIntake, validate, encryptField };
