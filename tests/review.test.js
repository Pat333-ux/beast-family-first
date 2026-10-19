const { tokenFor } = require('./helpers');
jest.mock('../db', () => ({ query: jest.fn(), getPool: jest.fn() }));
jest.mock('../src/engine/routingEngine', () => ({ dispatchResource: jest.fn(() => Promise.resolve({})) }));
const request = require('supertest');
const db = require('../db');
const routing = require('../src/engine/routingEngine');
const app = require('../src/app');

const ID = '22222222-2222-2222-2222-222222222222';
const mockClient = (status = 'submitted') => {
  const client = {
    release: jest.fn(),
    query: jest.fn(async (sql) => {
      if (/FOR UPDATE/.test(sql)) return { rows: [{ status }] };
      if (/UPDATE intake_requests/.test(sql)) return { rows: [{ id: ID, status: 'approved', priority_level: 'URGENT' }] };
      return { rows: [] };
    })
  };
  db.getPool.mockReturnValue({ connect: async () => client });
  return client;
};

test('blocks non-caseworker approval', async () => {
  const r = await request(app).post('/api/v1/review/approve').set('Authorization', tokenFor('Citizen')).send({});
  expect(r.status).toBe(403);
});

test('queue sorts by priority then score', async () => {
  db.query.mockResolvedValueOnce({ rows: [] });
  const r = await request(app).get('/api/v1/review/queue').set('Authorization', tokenFor('CaseWorker'));
  expect(r.status).toBe(200);
  const sql = db.query.mock.calls[0][0];
  expect(sql).toMatch(/WHEN 'EMERGENCY' THEN 1 WHEN 'URGENT' THEN 2/);
  expect(sql).toMatch(/priority_score DESC/);
});

test('approval commits transaction, audits and triggers dispatch', async () => {
  const client = mockClient();
  const r = await request(app).post('/api/v1/review/approve').set('Authorization', tokenFor('CaseWorker'))
    .send({ requestId: ID, approvedPathways: ['housing'] });
  expect(r.status).toBe(200);
  const sqls = client.query.mock.calls.map((c) => c[0]);
  expect(sqls).toContain('BEGIN');
  expect(sqls.some((s) => /system_audit_logs/.test(s))).toBe(true);
  expect(sqls).toContain('COMMIT');
  expect(routing.dispatchResource).toHaveBeenCalledWith(expect.objectContaining({ requestId: ID, approvedPathways: ['housing'] }));
});

test('rejects spoofed caseworkerId and invalid transitions', async () => {
  const spoof = await request(app).post('/api/v1/review/approve').set('Authorization', tokenFor('CaseWorker'))
    .send({ requestId: ID, caseworkerId: 'other', approvedPathways: ['housing'] });
  expect(spoof.status).toBe(403);
  const client = mockClient('closed');
  const r = await request(app).post('/api/v1/review/approve').set('Authorization', tokenFor('CaseWorker'))
    .send({ requestId: ID, approvedPathways: ['housing'] });
  expect(r.status).toBe(409);
  expect(client.query).toHaveBeenCalledWith('ROLLBACK');
});

test('deny closes case', async () => {
  mockClient();
  const r = await request(app).post('/api/v1/review/deny').set('Authorization', tokenFor('Supervisor'))
    .send({ requestId: ID, reason: 'Ineligible' });
  expect(r.status).toBe(200);
});
