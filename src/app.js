const express = require('express');
const { createAuthRouter } = require('./routes/auth');

function createApp({ pool, jwtSecret = process.env.JWT_SECRET } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/v1/auth', createAuthRouter({ pool, jwtSecret }));
  return app;
}

module.exports = { createApp };
