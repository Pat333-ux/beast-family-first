const { tokenFor } = require('./helpers');
jest.mock('../db', () => ({ query: jest.fn(), getPool: jest.fn() }));
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const app = require('../src/app');

beforeEach(() => db.query.mockReset());

test('login returns JWT with sub, email, role', async () => {
  const hash = bcrypt.hashSync('correct-horse-battery', 4);
  db.query.mockResolvedValueOnce({ rows: [{ id: 'u-1', email: 'a@b.org', password_hash: hash, role: 'CaseWorker', active: true }] });
  const r = await request(app).post('/api/v1/auth/login').send({ email: 'a@b.org', password: 'correct-horse-battery' });
  expect(r.status).toBe(200);
  const c = jwt.verify(r.body.token, 'test-secret');
  expect(c).toMatchObject({ sub: 'u-1', email: 'a@b.org', role: 'CaseWorker' });
});

test('login rejects bad password, unknown user and inactive user', async () => {
  const hash = bcrypt.hashSync('right-password-123', 4);
  db.query.mockResolvedValue({ rows: [{ id: 'u-1', email: 'a@b.org', password_hash: hash, role: 'Auditor', active: true }] });
  expect((await request(app).post('/api/v1/auth/login').send({ email: 'a@b.org', password: 'wrong' })).status).toBe(401);
  db.query.mockResolvedValue({ rows: [] });
  expect((await request(app).post('/api/v1/auth/login').send({ email: 'x@b.org', password: 'whatever' })).status).toBe(401);
  db.query.mockResolvedValue({ rows: [{ id: 'u-1', email: 'a@b.org', password_hash: hash, role: 'Auditor', active: false }] });
  expect((await request(app).post('/api/v1/auth/login').send({ email: 'a@b.org', password: 'right-password-123' })).status).toBe(401);
  expect((await request(app).post('/api/v1/auth/login').send({})).status).toBe(400);
});

test('register is admin-only and hashes password', async () => {
  const body = { email: 'new@b.org', password: 'a-long-password-1', role: 'Supervisor' };
  expect((await request(app).post('/api/v1/auth/register').send(body)).status).toBe(401);
  expect((await request(app).post('/api/v1/auth/register').set('Authorization', tokenFor('CaseWorker')).send(body)).status).toBe(403);

  db.query.mockResolvedValue({ rows: [{ id: 'u-2', email: 'new@b.org', role: 'Supervisor' }] });
  const r = await request(app).post('/api/v1/auth/register').set('Authorization', tokenFor('Administrator')).send(body);
  expect(r.status).toBe(201);
  const insertArgs = db.query.mock.calls[0][1];
  expect(insertArgs[1]).not.toBe(body.password);
  expect(bcrypt.compareSync(body.password, insertArgs[1])).toBe(true);
});

test('register validates role and password', async () => {
  const auth = tokenFor('Administrator');
  expect((await request(app).post('/api/v1/auth/register').set('Authorization', auth)
    .send({ email: 'n@b.org', password: 'a-long-password-1', role: 'Citizen' })).status).toBe(400);
  expect((await request(app).post('/api/v1/auth/register').set('Authorization', auth)
    .send({ email: 'n@b.org', password: 'short', role: 'Auditor' })).status).toBe(400);
  db.query.mockRejectedValue(Object.assign(new Error('dup'), { code: '23505' }));
  expect((await request(app).post('/api/v1/auth/register').set('Authorization', auth)
    .send({ email: 'n@b.org', password: 'a-long-password-1', role: 'Auditor' })).status).toBe(409);
});
