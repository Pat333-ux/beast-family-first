const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const { authenticate, requireRole } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

const router = express.Router();
const STAFF_ROLES = ['CaseWorker', 'Supervisor', 'Administrator', 'Auditor'];
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
// Valid hash used to equalize timing when the user does not exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password || password.length > 200) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET not configured');
    const { rows } = await db.query(
      'SELECT id, email, password_hash, role, active FROM users WHERE lower(email) = lower($1)', [email]);
    const user = rows[0];
    const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
    if (!user || !ok || !user.active) {
      await db.query(
        `INSERT INTO system_audit_logs (user_id, action, target_type, ip_address, metadata)
         VALUES ($1,'LOGIN_FAILED','user',$2,$3)`,
        [user ? user.id : null, req.ip, JSON.stringify({})]).catch(() => {});
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET, { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '8h' });
    return res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (e) { return next(e); }
});

router.post('/register', authenticate, requireRole('Administrator'), async (req, res, next) => {
  try {
    const { email, password, role } = req.body || {};
    if (typeof email !== 'string' || !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Valid email required' });
    if (typeof password !== 'string' || password.length < 12 || password.length > 200) {
      return res.status(400).json({ error: 'password must be 12-200 characters' });
    }
    if (!STAFF_ROLES.includes(role)) return res.status(400).json({ error: `role must be one of ${STAFF_ROLES.join(', ')}` });
    const hash = await bcrypt.hash(password, 12);
    let user;
    try {
      const r = await db.query(
        'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id, email, role', [email, hash, role]);
      user = r.rows[0];
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Email already registered' });
      throw e;
    }
    await db.query(
      `INSERT INTO system_audit_logs (user_id, action, target_type, target_id, ip_address, metadata)
       VALUES ($1,'USER_REGISTERED','user',$2,$3,$4)`,
      [req.user.id, user.id, req.ip, JSON.stringify({ role })]);
    return res.status(201).json({ user });
  } catch (e) { return next(e); }
});

module.exports = router;
