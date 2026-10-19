const express = require('express');
const db = require('../../db');
const { requireRole } = require('../middleware/auth');

const router = express.Router();

// Estimated avoided state cost per prevented acute intervention (USD); configurable.
const COST_PER_PREVENTED = Number(process.env.COST_SAVINGS_PER_PREVENTED_INTERVENTION || 5000);

const CATEGORY = {
  HOUSING_STABILIZATION_GRANT: 'Housing', housing: 'Housing',
  MENTAL_HEALTH: 'Mental Health', mental_health: 'Mental Health',
  COMMUNITY_FOOD_NETWORK: 'Food', food: 'Food',
  TRAUMA_PREVENTION_PATHWAY: 'Trauma Prevention', trauma_prevention: 'Trauma Prevention'
};

router.get('/metrics', requireRole('Supervisor', 'Administrator', 'Auditor'), async (req, res, next) => {
  try {
    const [vol, speed, alloc] = await Promise.all([
      db.query('SELECT priority_level, COUNT(*)::int AS n FROM intake_requests GROUP BY priority_level'),
      db.query(`SELECT AVG(EXTRACT(EPOCH FROM (approved_at - created_at)))::float AS secs
                FROM intake_requests WHERE approved_at IS NOT NULL`),
      db.query(`SELECT resource_type, COUNT(*)::int AS n FROM resource_allocations
                WHERE status = 'dispatched' GROUP BY resource_type`)
    ]);
    const intakeVolume = { EMERGENCY: 0, URGENT: 0, STANDARD: 0, total: 0 };
    for (const r of vol.rows) { intakeVolume[r.priority_level] = r.n; intakeVolume.total += r.n; }

    const fulfillment = { Housing: 0, 'Mental Health': 0, Food: 0, 'Trauma Prevention': 0 };
    for (const r of alloc.rows) {
      const cat = CATEGORY[r.resource_type];
      if (cat) fulfillment[cat] += r.n;
    }
    const prevented = fulfillment.Housing + fulfillment['Trauma Prevention'] + fulfillment['Mental Health'];
    res.json({
      intakeVolume,
      avgApprovalSeconds: speed.rows[0].secs,
      dispatchFulfillmentByCategory: fulfillment,
      estimatedCostSavings: { preventedInterventions: prevented, costPerIntervention: COST_PER_PREVENTED, totalUsd: prevented * COST_PER_PREVENTED }
    });
  } catch (e) { next(e); }
});

module.exports = router;
