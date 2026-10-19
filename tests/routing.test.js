require('./helpers');
jest.mock('../db', () => ({ query: jest.fn() }));
const db = require('../db');
process.env.WEBHOOK_BASE_DELAY_MS = '1';
process.env.WEBHOOK_SIGNING_SECRET = 'shared-secret';
const crypto = require('crypto');
const routing = require('../src/engine/routingEngine');

afterEach(() => { jest.resetAllMocks(); delete global.fetch; });

test('url safety', () => {
  expect(routing.isSafeWebhookUrl('https://partner.org/hook')).toBe(true);
  expect(routing.isSafeWebhookUrl('http://partner.org')).toBe(false);
  expect(routing.isSafeWebhookUrl('https://127.0.0.1/x')).toBe(false);
  expect(routing.isSafeWebhookUrl('https://localhost/x')).toBe(false);
});

test('dispatches, retries, records status, sends no identity', async () => {
  db.query.mockImplementation(async (sql) =>
    /FROM partner_organizations/.test(sql) ? { rows: [{ id: 'p1', webhook_url: 'https://partner.org/hook' }] } : { rows: [] });
  global.fetch = jest.fn()
    .mockRejectedValueOnce(new Error('down'))
    .mockResolvedValueOnce({ ok: true });
  const s = await routing.dispatchResource({ requestId: 'r1', priorityLevel: 'URGENT', approvedPathways: ['housing'] });
  expect(s.dispatched).toBe(1);
  expect(global.fetch).toHaveBeenCalledTimes(2);
  const body = JSON.parse(global.fetch.mock.calls[0][1].body);
  expect(body).toEqual(expect.objectContaining({ allocationRef: 'r1', priorityLevel: 'URGENT' }));
  expect(body.familyId).toBeUndefined();
  const sig = global.fetch.mock.calls[1][1].headers['X-BEAST-Signature'];
  const [, t, v1] = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(sig);
  const expected = crypto.createHmac('sha256', 'shared-secret').update(`${t}.${global.fetch.mock.calls[1][1].body}`).digest('hex');
  expect(v1).toBe(expected);
  const insert = db.query.mock.calls.find((c) => /INSERT INTO resource_allocations/.test(c[0]));
  expect(insert[1][3]).toBe('dispatched');
});

test('records failure after retries', async () => {
  db.query.mockImplementation(async (sql) =>
    /FROM partner_organizations/.test(sql) ? { rows: [{ id: 'p1', webhook_url: 'https://partner.org/hook' }] } : { rows: [] });
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 500 });
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const s = await routing.dispatchResource({ requestId: 'r1', priorityLevel: 'URGENT', approvedPathways: ['food'] });
  expect(s.failed).toBe(1);
  expect(global.fetch).toHaveBeenCalledTimes(3);
});

test('uses per-partner secret and refuses to send unsigned', async () => {
  db.query.mockImplementation(async (sql) =>
    /FROM partner_organizations/.test(sql) ? { rows: [{ id: 'p1', webhook_url: 'https://partner.org/hook', webhook_secret: 'partner-key' }] } : { rows: [] });
  global.fetch = jest.fn().mockResolvedValue({ ok: true });
  await routing.dispatchResource({ requestId: 'r1', priorityLevel: 'URGENT', approvedPathways: ['food'] });
  const opts = global.fetch.mock.calls[0][1];
  const t = /t=(\d+)/.exec(opts.headers['X-BEAST-Signature'])[1];
  expect(opts.headers['X-BEAST-Signature']).toContain(crypto.createHmac('sha256', 'partner-key').update(`${t}.${opts.body}`).digest('hex'));

  delete process.env.WEBHOOK_SIGNING_SECRET;
  db.query.mockImplementation(async (sql) =>
    /FROM partner_organizations/.test(sql) ? { rows: [{ id: 'p1', webhook_url: 'https://partner.org/hook' }] } : { rows: [] });
  global.fetch = jest.fn();
  jest.spyOn(console, 'error').mockImplementation(() => {});
  const s = await routing.dispatchResource({ requestId: 'r1', priorityLevel: 'URGENT', approvedPathways: ['food'] });
  expect(s.failed).toBe(1);
  expect(global.fetch).not.toHaveBeenCalled();
});
