require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { authenticate } = require('./middleware/auth');
const { intakeLimiter } = require('./middleware/rateLimiter');

const app = express();
// Cloud Run sits behind one proxy; needed for correct client IPs in rate limiting.
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : false }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api/v1/auth', require('./routes/auth'));
app.use('/api/v1/intake', intakeLimiter, authenticate, require('./routes/intake'));
app.use('/api/v1/review', authenticate, require('./routes/review'));
app.use('/api/v1/analytics', authenticate, require('./routes/analytics'));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.statusCode || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'Internal server error' : err.message });
});

module.exports = app;
