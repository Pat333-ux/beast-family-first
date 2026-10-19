const bcrypt = require('bcryptjs');
const express = require('express');
const jwt = require('jsonwebtoken');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const { createRateLimiter } = require('../middleware/rateLimiter');

const USER_ROLES = ['Caseworker', 'Supervisor', 'Administrator', 'Auditor'];
const BCRYPT_ROUNDS = 12;

function createAuthRouter({ pool, jwtSecret = process.env.JWT_SECRET, rateLimiter } = {}) {
  if (!pool || typeof pool.query !== 'function') {
    throw new TypeError('A PostgreSQL pool is required');
  }
  if (typeof jwtSecret !== 'string' || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes');
  }

  const router = express.Router();
  router.use(rateLimiter || createRateLimiter());

  router.post('/login', async (req, res) => {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
      const result = await pool.query(
        `SELECT user_id, email, password_hash, role, is_active
         FROM users WHERE email = $1`,
        [email.trim().toLowerCase()]
      );
      const user = result.rows[0];
      const passwordMatches = user && user.is_active === true &&
        Buffer.byteLength(password) <= 72 &&
        await bcrypt.compare(password, user.password_hash);

      if (!passwordMatches) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { email: user.email, role: user.role },
        jwtSecret,
        { subject: user.user_id, expiresIn: '8h', algorithm: 'HS256' }
      );
      return res.json({
        token,
        user: { userId: user.user_id, email: user.email, role: user.role }
      });
    } catch {
      return res.status(500).json({ error: 'Unable to process login' });
    }
  });

  router.post(
    '/register',
    authenticateToken(jwtSecret),
    authorizeRoles('Administrator'),
    async (req, res) => {
      const { fullName, email, password, role } = req.body || {};
      if (
        typeof fullName !== 'string' || !fullName.trim() ||
        typeof email !== 'string' || !email.trim() ||
        typeof password !== 'string' ||
        Buffer.byteLength(password) < 12 || Buffer.byteLength(password) > 72 ||
        !USER_ROLES.includes(role)
      ) {
        return res.status(400).json({ error: 'Invalid user details' });
      }

      try {
        const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
        const result = await pool.query(
          `INSERT INTO users (full_name, email, password_hash, role)
           VALUES ($1, $2, $3, $4)
           RETURNING user_id, full_name, email, role, is_active, created_at`,
          [fullName.trim(), email.trim().toLowerCase(), passwordHash, role]
        );
        const user = result.rows[0];
        return res.status(201).json({
          user: {
            userId: user.user_id,
            fullName: user.full_name,
            email: user.email,
            role: user.role,
            isActive: user.is_active,
            createdAt: user.created_at
          }
        });
      } catch (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'A user with that email already exists' });
        }
        return res.status(500).json({ error: 'Unable to register user' });
      }
    }
  );

  return router;
}

module.exports = { createAuthRouter, USER_ROLES };
