/**
 * Lightweight migration runner. Applies db/migrations/*.sql in filename order,
 * each in its own transaction, tracked in schema_migrations.
 * Usage: node db/migrate.js   (requires DATABASE_URL)
 */
const fs = require('fs');
const path = require('path');
const db = require('./index');

const DIR = path.join(__dirname, 'migrations');

async function migrate() {
  const client = await db.getPool().connect();
  const applied = [];
  try {
    await client.query('SELECT pg_advisory_lock(727001)');
    await client.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      try {
        await client.query('BEGIN');
        await client.query(fs.readFileSync(path.join(DIR, f), 'utf8'));
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        applied.push(f);
        console.log(`Applied ${f}`);
      } catch (e) {
        await client.query('ROLLBACK');
        throw new Error(`Migration ${f} failed: ${e.message}`);
      }
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
    client.release();
  }
  return applied;
}

module.exports = { migrate };

if (require.main === module) {
  migrate()
    .then((a) => { console.log(`Done. ${a.length} migration(s) applied.`); return db.getPool().end(); })
    .catch((e) => { console.error(e.message); process.exit(1); });
}
