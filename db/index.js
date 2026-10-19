const { Pool } = require('pg');

// SSL for GCP Cloud SQL; set DB_SSL=false for local development.
function buildSsl() {
  if (process.env.DB_SSL === 'false') return false;
  const ssl = { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' };
  if (process.env.DB_SSL_CA) ssl.ca = process.env.DB_SSL_CA;
  return ssl;
}

let pool;
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DB_POOL_MAX || 10),
      ssl: buildSsl()
    });
  }
  return pool;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
  getPool
};
