const express = require('express');
const { createAuthRouter } = require('./routes/auth');
const { createIntakeRouter } = require('./routes/intake');
const { createReviewRouter } = require('./routes/review');
const { createAnalyticsRouter } = require('./routes/analytics');

function createApp({
  pool,
  jwtSecret = process.env.JWT_SECRET,
  encryptionKey = process.env.INTAKE_ENCRYPTION_KEY,
  webhookUrl = process.env.COMMUNITY_PARTNER_WEBHOOK_URL,
  webhookSecret = process.env.WEBHOOK_SECRET,
  savings,
  dispatchWebhook,
} = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/auth', createAuthRouter({ pool, jwtSecret }));
  app.use('/api/v1/intake', createIntakeRouter({ pool, encryptionKey }));
  app.use('/api/v1/review', createReviewRouter({
    pool,
    jwtSecret,
    encryptionKey,
    webhookUrl,
    webhookSecret,
    ...(savings ? { savings } : {}),
    ...(dispatchWebhook ? { dispatchWebhook } : {}),
  }));
  app.use('/api/v1/analytics', createAnalyticsRouter({ pool, jwtSecret }));
  return app;
}

module.exports = { createApp };
