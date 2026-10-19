const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { applyMigrations } = require('../db/migrate');

describe('database migration runner', () => {
  let migrationsDir;
  let client;
  let applied;

  beforeEach(() => {
    migrationsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'beast-migrations-'));
    fs.writeFileSync(path.join(migrationsDir, '002_second.sql'), 'SELECT 2');
    fs.writeFileSync(path.join(migrationsDir, '001_first.sql'), 'SELECT 1');
    applied = new Set();
    client = {
      query: jest.fn(async (sql, params) => {
        if (sql.includes('SELECT version FROM schema_migrations')) {
          return { rows: [...applied].map((version) => ({ version })) };
        }
        if (sql.includes('INSERT INTO schema_migrations')) applied.add(params[0]);
        return { rows: [] };
      }),
      release: jest.fn()
    };
  });

  afterEach(() => fs.rmSync(migrationsDir, { recursive: true, force: true }));

  test('applies SQL migrations in order and records each migration', async () => {
    const pool = { connect: jest.fn().mockResolvedValue(client) };
    const migrations = await applyMigrations({ pool, migrationsDir });

    expect(migrations).toEqual(['001_first.sql', '002_second.sql']);
    const executedSql = client.query.mock.calls.map(([sql]) => sql);
    expect(executedSql.indexOf('SELECT 1')).toBeLessThan(executedSql.indexOf('SELECT 2'));
    expect(applied).toEqual(new Set(migrations));
    expect(client.release).toHaveBeenCalled();
  });
});
