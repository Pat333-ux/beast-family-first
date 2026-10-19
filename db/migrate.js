const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const MIGRATION_LOCK = 1279344462;
const DEFAULT_MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function applyMigrations({ pool, migrationsDir = DEFAULT_MIGRATIONS_DIR }) {
  if (!pool || typeof pool.connect !== 'function') {
    throw new TypeError('A PostgreSQL pool is required');
  }

  const client = await pool.connect();
  let lockAcquired = false;

  try {
    await client.query('SELECT pg_advisory_lock($1, $2)', [MIGRATION_LOCK, 1]);
    lockAcquired = true;
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const migrations = fs.readdirSync(migrationsDir)
      .filter((file) => /^\d+_.+\.sql$/.test(file))
      .sort();
    const { rows } = await client.query('SELECT version FROM schema_migrations');
    const applied = new Set(rows.map((row) => row.version));

    for (const filename of migrations) {
      if (applied.has(filename)) continue;

      const sql = fs.readFileSync(path.join(migrationsDir, filename), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [filename]);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    }

    return migrations.filter((filename) => !applied.has(filename));
  } finally {
    if (lockAcquired) {
      await client.query('SELECT pg_advisory_unlock($1, $2)', [MIGRATION_LOCK, 1]);
    }
    client.release();
  }
}

if (require.main === module) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL must be set');
    process.exitCode = 1;
  } else {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    applyMigrations({ pool })
      .then((migrations) => {
        console.log(`Applied ${migrations.length} migration(s)`);
      })
      .catch((error) => {
        console.error('Migration failed:', error.message);
        process.exitCode = 1;
      })
      .finally(() => pool.end());
  }
}

module.exports = { applyMigrations, DEFAULT_MIGRATIONS_DIR };
