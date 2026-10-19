const express = require('express');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { writeAudit } = require('./audit');

const ANALYTICS_ROLES = ['Supervisor', 'Administrator', 'Auditor'];
const PRIORITIES = ['EMERGENCY', 'URGENT', 'STANDARD'];

function createAnalyticsRouter({ pool, jwtSecret = process.env.JWT_SECRET } = {}) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('A PostgreSQL pool is required');
  }
  const router = express.Router();
  router.use(authenticateToken(jwtSecret), authorizeRoles(...ANALYTICS_ROLES));

  router.get('/metrics', async (req, res) => {
    try {
      const [priorityResult, latencyResult, fulfillmentResult, savingsResult] = await Promise.all([
        pool.query(
          `SELECT priority, COUNT(*)::integer AS count
             FROM intake_requests
            GROUP BY priority`
        ),
        pool.query(
          `SELECT AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 60)
                    FILTER (WHERE status = 'APPROVED') AS average_processing_minutes,
                  AVG(EXTRACT(EPOCH FROM (reviewed_at - created_at)) / 3600)
                    FILTER (WHERE status IN ('APPROVED', 'DENIED')) AS average_resolution_hours
             FROM intake_requests`
        ),
        pool.query(
          `SELECT category, COUNT(*)::integer AS count
             FROM resource_assignments
            WHERE status = 'DISPATCHED'
            GROUP BY category`
        ),
        pool.query(
          `SELECT COALESCE(SUM(estimated_savings_cents), 0)::bigint AS savings_cents
             FROM resource_assignments
            WHERE status = 'DISPATCHED'`
        ),
      ]);
      const intakeVolumeByPriority = Object.fromEntries(PRIORITIES.map((priority) => [priority, 0]));
      for (const row of priorityResult.rows) {
        if (PRIORITIES.includes(row.priority)) intakeVolumeByPriority[row.priority] = Number(row.count);
      }
      const resourceFulfillmentByCategory = Object.fromEntries(
        fulfillmentResult.rows.map((row) => [row.category, Number(row.count)])
      );
      const averageProcessingMinutes = latencyResult.rows[0]?.average_processing_minutes;
      const averageResolutionHours = latencyResult.rows[0]?.average_resolution_hours;
      const savingsCents = Number(savingsResult.rows[0]?.savings_cents || 0);

      await writeAudit(pool, {
        userId: req.user.sub,
        action: 'ANALYTICS_ACCESSED',
        targetType: 'ANALYTICS',
        ipAddress: req.ip,
        metadata: {},
      });

      return res.json({
        intakeVolumeByPriority,
        averageProcessingMinutes: averageProcessingMinutes == null ? null : Number(averageProcessingMinutes),
        averageResolutionHours: averageResolutionHours == null ? null : Number(averageResolutionHours),
        resourceFulfillmentByCategory,
        estimatedIndianaCostSavings: Number.isSafeInteger(savingsCents) ? savingsCents / 100 : null,
        savingsEstimateSource: 'Configured pathway estimates for webhook-dispatched assignments; zero when no estimates are configured.',
      });
    } catch {
      return res.status(500).json({ error: 'Unable to calculate program analytics.' });
    }
  });

  return router;
}

module.exports = { createAnalyticsRouter, ANALYTICS_ROLES };
