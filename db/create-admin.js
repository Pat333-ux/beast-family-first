/**
 * Bootstrap the first Administrator.
 * Usage: ADMIN_EMAIL=... ADMIN_PASSWORD=... node db/create-admin.js
 */
const bcrypt = require('bcryptjs');
const db = require('./index');

(async () => {
  const { ADMIN_EMAIL: email, ADMIN_PASSWORD: password } = process.env;
  if (!email || !password || password.length < 12) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD (min 12 chars) are required');
  }
  const hash = await bcrypt.hash(password, 12);
  const { rows } = await db.query(
    `INSERT INTO users (email, password_hash, role) VALUES ($1,$2,'Administrator') RETURNING id`, [email, hash]);
  console.log(`Created administrator ${rows[0].id}`);
  await db.getPool().end();
})().catch((e) => { console.error(e.message); process.exit(1); });
