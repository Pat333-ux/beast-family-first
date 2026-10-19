const db = require('../../db');
const workflow = require('../engine/workflowEngine');
const routing = require('../engine/routingEngine');

async function getQueue(req, res, next) {
  try {
    const { rows } = await db.query(
      `SELECT id, family_id, status, priority_level, priority_score, risk_factors, suggested_pathways, created_at
       FROM intake_requests WHERE status = 'submitted'
       ORDER BY CASE priority_level WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2 ELSE 3 END,
                priority_score DESC, created_at ASC
       LIMIT 200`
    );
    res.json({ queue: rows });
  } catch (e) { next(e); }
}

const isUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

// Shared human decision: submitted -> under_review -> (approved|denied) in one transaction.
async function decide(req, res, next, decision) {
  const b = req.body || {};
  if (!isUuid(b.requestId)) return res.status(400).json({ error: 'requestId must be a UUID' });
  if (b.caseworkerId && b.caseworkerId !== req.user.id) {
    return res.status(403).json({ error: 'caseworkerId must match authenticated user' });
  }
  const approve = decision === 'approved';
  if (approve && (!Array.isArray(b.approvedPathways) || b.approvedPathways.length === 0 ||
      !b.approvedPathways.every((p) => typeof p === 'string' && p.length <= 100))) {
    return res.status(400).json({ error: 'approvedPathways must be a non-empty array of strings' });
  }
  if (!approve && (typeof b.reason !== 'string' || !b.reason.trim())) {
    return res.status(400).json({ error: 'reason is required' });
  }
  const notes = typeof b.notes === 'string' ? b.notes.slice(0, 2000) : null;
  const actor = { type: 'human', id: req.user.id };

  const client = await db.getPool().connect();
  let record;
  try {
    await client.query('BEGIN');
    const cur = await client.query('SELECT status FROM intake_requests WHERE id = $1 FOR UPDATE', [b.requestId]);
    if (cur.rows.length === 0) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Intake not found' }); }
    let status = cur.rows[0].status;
    if (status === 'submitted') status = workflow.transition(status, 'under_review', actor);
    status = workflow.transition(status, decision, actor);
    if (!approve) status = workflow.transition(status, 'closed', actor);

    const upd = await client.query(
      `UPDATE intake_requests SET status=$2, assigned_worker=$3, reviewer_notes=$4,
         approved_pathways=$5, approved_at = CASE WHEN $6 THEN now() ELSE approved_at END,
         closed_at = CASE WHEN $2='closed' THEN now() ELSE closed_at END, updated_at=now()
       WHERE id=$1
       RETURNING id, status, priority_level, priority_score, approved_pathways, approved_at`,
      [b.requestId, status, req.user.id, notes, JSON.stringify(approve ? b.approvedPathways : []), approve]
    );
    record = upd.rows[0];
    await client.query(
      `INSERT INTO system_audit_logs (user_id, action, target_type, target_id, ip_address, metadata)
       VALUES ($1,$2,'intake_request',$3,$4,$5)`,
      [req.user.id, approve ? 'INTAKE_APPROVED' : 'INTAKE_DENIED', b.requestId, req.ip,
        JSON.stringify({ caseworkerId: req.user.id, timestamp: new Date().toISOString(),
          pathways: approve ? b.approvedPathways : undefined, reason: approve ? undefined : b.reason, notes })]
    );
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.statusCode) return res.status(e.statusCode).json({ error: e.message });
    return next(e);
  } finally {
    client.release();
  }

  if (!approve) return res.json({ case: record, dispatch: { status: 'not_applicable' } });

  // Fire-and-forget: dispatch must not block or fail the approval.
  routing.dispatchResource({ requestId: record.id, priorityLevel: record.priority_level, approvedPathways: b.approvedPathways })
    .catch((err) => console.error('Dispatch error', err.message));
  return res.json({ case: record, dispatch: { status: 'triggered' } });
}

const approve = (req, res, next) => decide(req, res, next, 'approved');
const deny = (req, res, next) => decide(req, res, next, 'denied');

module.exports = { getQueue, approve, deny };
