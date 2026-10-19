process.env.JWT_SECRET = 'test-secret';
process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(64);
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');

const token = jwt.sign({ sub: 'u1', role: 'Citizen' }, 'test-secret');

test('requires auth', async () => {
  expect((await request(app).post('/api/v1/intake').send({})).status).toBe(401);
});
test('validates payload', async () => {
  const r = await request(app).post('/api/v1/intake').set('Authorization', 'Bearer ' + token).send({ housingStatus: 'x' });
  expect(r.status).toBe(400);
});
