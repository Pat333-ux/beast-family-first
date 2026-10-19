const { Pool } = require('pg');
const { createApp } = require('./app');

function startServer() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
  if (!process.env.JWT_SECRET || Buffer.byteLength(process.env.JWT_SECRET) < 32) {
    throw new Error('JWT_SECRET must be configured with at least 32 bytes');
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const app = createApp({ pool, jwtSecret: process.env.JWT_SECRET });
  const port = Number(process.env.PORT) || 3000;
  const server = app.listen(port, () => console.log(`BEAST API listening on port ${port}`));

  const shutdown = () => {
    server.close(() => pool.end().finally(() => process.exit(0)));
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return { app, pool, server };
}

if (require.main === module) {
  try {
    startServer();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { startServer };
