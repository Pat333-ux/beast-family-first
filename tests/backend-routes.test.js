const jwt = require('jsonwebtoken');
const request = require('supertest');
const { createApp } = require('../src/app');
const { decryptIntake, encryptIntake } = require('../src/security/intakeEncryption');

const JWT_SECRET = 'test-jwt-secret-that-is-at-least-32-bytes-long';
const ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
const CASE_ID = '00000000-0000-4000-8000-000000000001';
const WORKER_ID = '00000000-0000-4000-8000-000000000002';
const intake = {
  fullName: 'Taylor Example',
  email: 'taylor@example.org',
  phone: '',
  county: 'Marion',
  dependentsCount: 2,
  needs: ['housing', 'food', 'trauma_prevention'],
};

function authHeader(role = 'Caseworker') {
  return jwt.sign(
    { email: 'staff@example.org', role },
    JWT_SECRET,
    { subject: WORKER_ID, expiresIn: '8h', algorithm: 'HS256' }
  );
}

function makeClient(queryHandler = async () => ({ rows: [] })) {
  return {
    query: jest.fn(queryHandler),
    release: jest.fn(),
  };
}

function makeApp({ pool, ...options }) {
  return createApp({
    pool,
    jwtSecret: JWT_SECRET,
    encryptionKey: ENCRYPTION_KEY,
    ...options,
  });
}

describe('encrypted family intake', () => {
  test('encrypts intake, scores it, and records a non-sensitive audit event', async () => {
    let insertValues;
    const client = makeClient(async (sql, values) => {
      if (sql.includes('INSERT INTO intake_requests')) {
        insertValues = values;
        return { rows: [{ id: CASE_ID, tracking_id: values[0], status: 'PENDING_REVIEW' }] };
      }
      return { rows: [] };
    });
    const pool = { connect: jest.fn().mockResolvedValue(client), query: jest.fn() };

    const response = await request(makeApp({ pool }))
      .post('/api/v1/intake')
      .send(intake)
      .expect(201);

    expect(response.body.case.id).toBe(CASE_ID);
    expect(response.body.case.trackingId).toMatch(/^INT-\d{4}-[A-F0-9]{8}$/);
    expect(response.body.case.assessment).toMatchObject({
      priority: 'URGENT',
      requiresHumanReview: true,
      suggestedPathways: expect.arrayContaining(['TRAUMA_PREVENTION_PATHWAY']),
    });
    expect(insertValues[1].toString()).not.toContain('Taylor Example');
    expect(decryptIntake({
      ciphertext: insertValues[1],
      iv: insertValues[2],
      tag: insertValues[3],
    }, ENCRYPTION_KEY)).toEqual(intake);
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO system_audit_logs'))).toBe(true);
    expect(client.query.mock.calls.at(-1)[0]).toBe('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  test.each([
    [{ ...intake, fullName: '' }, 'name'],
    [{ ...intake, email: 'not-an-email' }, 'email'],
    [{ ...intake, dependentsCount: -1 }, 'dependents'],
    [{ ...intake, needs: ['unknown'] }, 'needs'],
    [{ ...intake, needs: ['food', 'food'] }, 'duplicate'],
  ])('rejects invalid intake before database access (%s)', async (payload) => {
    const pool = { connect: jest.fn(), query: jest.fn() };
    await request(makeApp({ pool })).post('/api/v1/intake').send(payload).expect(400);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('does not accept or store family details when encryption is unconfigured', async () => {
    const pool = { connect: jest.fn(), query: jest.fn() };
    await request(createApp({ pool, jwtSecret: JWT_SECRET }))
      .post('/api/v1/intake')
      .send(intake)
      .expect(503);
    expect(pool.connect).not.toHaveBeenCalled();
  });

  test('rejects corrupted ciphertext and incorrect encryption keys', () => {
    const encrypted = encryptIntake(intake, ENCRYPTION_KEY);
    expect(() => decryptIntake({
      ...encrypted,
      ciphertext: Buffer.from('tampered'),
    }, ENCRYPTION_KEY)).toThrow();
    expect(() => encryptIntake(intake, 'short')).toThrow(/32-byte/);
  });
});

describe('caseworker review and webhook routing', () => {
  const pendingCase = {
    id: CASE_ID,
    tracking_id: 'INT-2026-00000001',
    status: 'PENDING_REVIEW',
    priority: 'EMERGENCY',
    risk_score: 95,
    assessment: { riskFactors: ['HOUSING_UNSTABLE'] },
  };

  test('requires a Caseworker-family role and returns the encrypted queue in priority order', async () => {
    const encrypted = encryptIntake(intake, ENCRYPTION_KEY);
    const pool = {
      connect: jest.fn(),
      query: jest.fn(async (sql) => {
        if (sql.includes('FROM intake_requests')) {
          return { rows: [{ ...pendingCase, ...{
            encrypted_payload: encrypted.ciphertext,
            encryption_iv: encrypted.iv,
            encryption_tag: encrypted.tag,
            created_at: new Date().toISOString(),
          } }] };
        }
        return { rows: [] };
      }),
    };
    const app = makeApp({ pool });

    await request(app).get('/api/v1/review/queue').expect(401);
    await request(app)
      .get('/api/v1/review/queue')
      .set('Authorization', 'Bearer ' + authHeader('Auditor'))
      .expect(403);
    const response = await request(app)
      .get('/api/v1/review/queue')
      .set('Authorization', 'Bearer ' + authHeader())
      .expect(200);

    expect(response.body.cases[0]).toMatchObject({
      id: CASE_ID,
      fullName: 'Taylor Example',
      county: 'Marion',
      priority: 'EMERGENCY',
    });
    expect(response.body.cases[0].email).toBe('taylor@example.org');
    const queueQuery = pool.query.mock.calls.find(([sql]) => sql.includes('FROM intake_requests'))[0];
    expect(queueQuery).toContain("WHEN 'EMERGENCY' THEN 0");
    expect(queueQuery).toContain('risk_score DESC');
  });

  test('approves transactionally, dispatches a signed webhook, and records the result', async () => {
    const reviewClient = makeClient(async (sql) => (
      sql.includes('SELECT id, tracking_id')
        ? { rows: [pendingCase] }
        : { rows: [] }
    ));
    const auditClient = makeClient();
    const pool = {
      connect: jest.fn()
        .mockResolvedValueOnce(reviewClient)
        .mockResolvedValueOnce(auditClient),
      query: jest.fn(),
    };
    const dispatchWebhook = jest.fn().mockResolvedValue({ ok: true });
    const app = makeApp({
      pool,
      webhookUrl: 'https://partner.example.org/events',
      webhookSecret: 'partner-secret',
      savings: { HOUSING_STABILIZATION_GRANT: 15000 },
      dispatchWebhook,
    });

    const response = await request(app)
      .post('/api/v1/review/approve')
      .set('Authorization', 'Bearer ' + authHeader())
      .send({
        caseId: CASE_ID,
        notes: 'Reviewed with family.',
        pathways: ['HOUSING_STABILIZATION_GRANT'],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      case: { id: CASE_ID, status: 'approved', assessment: { priority: 'EMERGENCY' } },
      routing: { status: 'dispatched' },
    });
    expect(dispatchWebhook).toHaveBeenCalledWith(
      'https://partner.example.org/events',
      expect.objectContaining({
        event: 'case.approved',
        caseId: CASE_ID,
        pathways: ['HOUSING_STABILIZATION_GRANT'],
      }),
      { secret: 'partner-secret' }
    );
    expect(reviewClient.query.mock.calls.at(-1)[0]).toBe('COMMIT');
    expect(reviewClient.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO resource_assignments'))).toBe(true);
    expect(auditClient.query.mock.calls.some(([sql]) => sql.includes('ROUTING_WEBHOOK_DISPATCHED'))).toBe(false);
    expect(auditClient.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO system_audit_logs'))).toBe(true);
  });

  test('rejects a denial without a reason and records a valid denial', async () => {
    const client = makeClient(async (sql) => (
      sql.includes('SELECT id, tracking_id')
        ? { rows: [pendingCase] }
        : { rows: [] }
    ));
    const pool = { connect: jest.fn().mockResolvedValue(client), query: jest.fn() };
    const app = makeApp({ pool });

    await request(app)
      .post('/api/v1/review/deny')
      .set('Authorization', 'Bearer ' + authHeader())
      .send({ caseId: CASE_ID })
      .expect(400);
    expect(pool.connect).not.toHaveBeenCalled();

    const response = await request(app)
      .post('/api/v1/review/deny')
      .set('Authorization', 'Bearer ' + authHeader())
      .send({ caseId: CASE_ID, notes: 'Unable to verify eligibility.' })
      .expect(200);
    expect(response.body.case.status).toBe('denied');
    expect(response.body.routing.status).toBe('not_applicable');
    expect(client.query.mock.calls.some(([sql]) => sql.includes('INSERT INTO case_reviews'))).toBe(true);
  });

  test('prevents invalid pathways and duplicate decisions', async () => {
    const client = makeClient(async (sql) => (
      sql.includes('SELECT id, tracking_id')
        ? { rows: [{ ...pendingCase, status: 'APPROVED' }] }
        : { rows: [] }
    ));
    const pool = { connect: jest.fn().mockResolvedValue(client), query: jest.fn() };
    const app = makeApp({ pool });

    await request(app)
      .post('/api/v1/review/approve')
      .set('Authorization', 'Bearer ' + authHeader())
      .send({ caseId: CASE_ID, pathways: ['not-a-pathway'] })
      .expect(400);
    await request(app)
      .post('/api/v1/review/approve')
      .set('Authorization', 'Bearer ' + authHeader())
      .send({ caseId: CASE_ID })
      .expect(409);
  });

  test('keeps an approval and reports routing configuration or delivery failure', async () => {
    const reviewClient = makeClient(async (sql) => (
      sql.includes('SELECT id, tracking_id')
        ? { rows: [pendingCase] }
        : { rows: [] }
    ));
    const auditClient = makeClient();
    const pool = {
      connect: jest.fn()
        .mockResolvedValueOnce(reviewClient)
        .mockResolvedValueOnce(auditClient)
        .mockResolvedValueOnce(reviewClient)
        .mockResolvedValueOnce(auditClient),
      query: jest.fn(),
    };
    const dispatchWebhook = jest.fn().mockRejectedValue(new Error('partner unavailable'));
    const app = makeApp({
      pool,
      webhookUrl: 'https://partner.example.org/events',
      webhookSecret: 'partner-secret',
      dispatchWebhook,
    });

    const failed = await request(app)
      .post('/api/v1/review/approve')
      .set('Authorization', 'Bearer ' + authHeader())
      .send({ caseId: CASE_ID, pathways: ['COMMUNITY_FOOD_NETWORK'] })
      .expect(200);
    expect(failed.body.routing.status).toBe('failed');

    const notConfigured = await request(makeApp({ pool }))
      .post('/api/v1/review/approve')
      .set('Authorization', 'Bearer ' + authHeader())
      .send({ caseId: CASE_ID })
      .expect(200);
    expect(notConfigured.body.routing.status).toBe('not_configured');
  });
});

describe('role-protected analytics', () => {
  test('aggregates persisted priority, latency, routed resources, and configured savings', async () => {
    const pool = {
      connect: jest.fn(),
      query: jest.fn(async (sql) => {
        if (sql.includes('GROUP BY priority')) {
          return { rows: [{ priority: 'EMERGENCY', count: 3 }, { priority: 'URGENT', count: 2 }] };
        }
        if (sql.includes('average_processing_minutes')) {
          return { rows: [{ average_processing_minutes: '12.5', average_resolution_hours: '48' }] };
        }
        if (sql.includes('GROUP BY category')) {
          return { rows: [{ category: 'housing', count: 4 }] };
        }
        if (sql.includes('savings_cents')) return { rows: [{ savings_cents: '12500' }] };
        if (sql.includes('INSERT INTO system_audit_logs')) return { rows: [] };
        throw new Error('Unexpected query');
      }),
    };
    const app = makeApp({ pool });

    await request(app)
      .get('/api/v1/analytics/metrics')
      .set('Authorization', 'Bearer ' + authHeader('Caseworker'))
      .expect(403);
    const response = await request(app)
      .get('/api/v1/analytics/metrics')
      .set('Authorization', 'Bearer ' + authHeader('Supervisor'))
      .expect(200);

    expect(response.body).toMatchObject({
      intakeVolumeByPriority: { EMERGENCY: 3, URGENT: 2, STANDARD: 0 },
      averageProcessingMinutes: 12.5,
      averageResolutionHours: 48,
      resourceFulfillmentByCategory: { housing: 4 },
      estimatedIndianaCostSavings: 125,
    });
    expect(pool.query.mock.calls).toHaveLength(5);
  });

  test('reports an empty baseline as zero rather than invented metrics', async () => {
    const pool = {
      connect: jest.fn(),
      query: jest.fn(async (sql) => {
        if (sql.includes('GROUP BY priority') || sql.includes('GROUP BY category')) return { rows: [] };
        if (sql.includes('average_processing_minutes')) {
          return { rows: [{ average_processing_minutes: null, average_resolution_hours: null }] };
        }
        if (sql.includes('savings_cents')) return { rows: [{ savings_cents: '0' }] };
        return { rows: [] };
      }),
    };
    const response = await request(makeApp({ pool }))
      .get('/api/v1/analytics/metrics')
      .set('Authorization', 'Bearer ' + authHeader('Auditor'))
      .expect(200);

    expect(response.body.intakeVolumeByPriority).toEqual({ EMERGENCY: 0, URGENT: 0, STANDARD: 0 });
    expect(response.body.averageProcessingMinutes).toBeNull();
    expect(response.body.estimatedIndianaCostSavings).toBe(0);
  });
});
