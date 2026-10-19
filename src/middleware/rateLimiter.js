const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: message }
  });

// Brute-force protection for login: per-IP, failed and successful attempts alike.
const loginLimiter = make(
  15 * 60 * 1000,
  Number(process.env.LOGIN_RATE_LIMIT_MAX || 10),
  'Too many login attempts, try again later'
);

const intakeLimiter = make(
  60 * 1000,
  Number(process.env.INTAKE_RATE_LIMIT_MAX || 60),
  'Too many intake requests, try again later'
);

module.exports = { loginLimiter, intakeLimiter, make };
