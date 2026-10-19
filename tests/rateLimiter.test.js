require('./helpers');
const express = require('express');
const request = require('supertest');
const { make } = require('../src/middleware/rateLimiter');

test('limiter returns 429 after max requests', async () => {
  const app = express();
  app.use(make(60000, 2, 'slow down'));
  app.get('/', (req, res) => res.send('ok'));
  await request(app).get('/'); await request(app).get('/');
  const r = await request(app).get('/');
  expect(r.status).toBe(429);
  expect(r.body.error).toBe('slow down');
});

test('login is rate limited', async () => {
  jest.resetModules();
  process.env.LOGIN_RATE_LIMIT_MAX = '2';
  jest.doMock('../db', () => ({ query: jest.fn(), getPool: jest.fn() }));
  const app = require('../src/app');
  const codes = [];
  for (let i = 0; i < 3; i++) codes.push((await request(app).post('/api/v1/auth/login').send({})).status);
  expect(codes).toEqual([400, 400, 429]);
});
