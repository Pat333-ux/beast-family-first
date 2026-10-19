const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-bytes-long';
const PASSWORD = 'family-support-password';

describe('authentication routes', () => {
  let pool;
  let app;
  let adminToken;
  let workerToken;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(PASSWORD, 4);
    pool = {
      query: jest.fn(async (sql, params) => {
        if (sql.includes('SELECT user_id')) {
          if (params[0] !== 'worker@example.org') return { rows: [] };
          return {
            rows: [{
              user_id: 'user-123',
              email: 'worker@example.org',
              password_hash: passwordHash,
              role: 'Caseworker',
              is_active: true
            }]
          };
        }
        if (sql.includes('INSERT INTO users')) {
          return {
            rows: [{
              user_id: 'new-user',
              full_name: params[0],
              email: params[1],
              role: params[3],
              is_active: true,
              created_at: new Date().toISOString()
            }]
          };
        }
        throw new Error('Unexpected query');
      })
    };
    app = createApp({ pool, jwtSecret: JWT_SECRET });
    adminToken = jwt.sign(
      { email: 'admin@example.org', role: 'Administrator' },
      JWT_SECRET,
      { subject: 'admin-123', expiresIn: '8h', algorithm: 'HS256' }
    );
    workerToken = jwt.sign(
      { email: 'worker@example.org', role: 'Caseworker' },
      JWT_SECRET,
      { subject: 'user-123', algorithm: 'HS256' }
    );
  });

  test('logs in with valid credentials and issues an 8-hour JWT', async () => {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: ' WORKER@example.org ', password: PASSWORD })
      .expect(200);

    const payload = jwt.verify(response.body.token, JWT_SECRET, { algorithms: ['HS256'] });
    expect(payload.sub).toBe('user-123');
    expect(payload.email).toBe('worker@example.org');
    expect(payload.role).toBe('Caseworker');
    expect(payload.exp - payload.iat).toBe(8 * 60 * 60);
  });

  test('returns 401 for invalid credentials', async () => {
    await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'worker@example.org', password: 'wrong-password' })
      .expect(401);
  });

  test('blocks registration by non-Administrator users', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', 'Bearer ' + workerToken)
      .send({
        fullName: 'New Worker',
        email: 'new@example.org',
        password: PASSWORD,
        role: 'Caseworker'
      })
      .expect(403);
  });

  test('allows an Administrator to register a user without returning the password hash', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .set('Authorization', 'Bearer ' + adminToken)
      .send({
        fullName: 'New Worker',
        email: 'new@example.org',
        password: PASSWORD,
        role: 'Caseworker'
      })
      .expect(201);

    expect(response.body.user.email).toBe('new@example.org');
    expect(response.body.user).not.toHaveProperty('password_hash');
  });
});
