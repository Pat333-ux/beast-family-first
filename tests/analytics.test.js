const { tokenFor } = require('./helpers');
jest.mock('../db', () => ({ query: jest.fn(), getPool: jest.fn() }));
const request = require('supertest');
const db = require('../db');
const app = require('../src/app');

test('blocks caseworker, computes metrics for supervisor', async () => {
  expect((await request(app).get('/api/v1/analytics/metrics').set('Authorization', tokenFor('CaseWorker'))).status).toBe(403);
  db.query
    .mockResolvedValueOnce({ rows: [{ priority_level: 'EMERGENCY', n: 2 }, { priority_level: 'STANDARD', n: 3 }] })
    .mockResolvedValueOnce({ rows: [{ secs: 120 }] })
    .mockResolvedValueOnce({ rows: [{ resource_type: 'housing', n: 2 }, { resource_type: 'COMMUNITY_FOOD_NETWORK', n: 1 }] });
  const r = await request(app).get('/api/v1/analytics/metrics').set('Authorization', tokenFor('Supervisor'));
  expect(r.status).toBe(200);
  expect(r.body.intakeVolume).toEqual({ EMERGENCY: 2, URGENT: 0, STANDARD: 3, total: 5 });
  expect(r.body.avgApprovalSeconds).toBe(120);
  expect(r.body.dispatchFulfillmentByCategory.Housing).toBe(2);
  expect(r.body.estimatedCostSavings.totalUsd).toBe(10000);
});
