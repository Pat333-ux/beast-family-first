'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createAppServer } = require('../src/http/server');

const scores = {
  housing: 60,
  food: 70,
  employment: 50,
  mentalHealth: 80,
  householdStress: 40,
  childWellbeing: 70
};

test('local API creates an intake, requires review, and records one human decision', async (t) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const healthResponse = await fetch(`${baseUrl}/api/health`);
  assert.equal(healthResponse.status, 200);
  assert.equal(healthResponse.headers.get('content-security-policy')?.includes("default-src 'self'"), true);

  const createResponse = await fetch(`${baseUrl}/api/intakes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores, needs: ['housing', 'food'] })
  });
  assert.equal(createResponse.status, 201);
  const created = (await createResponse.json()).case;
  assert.equal(created.status, 'pending_review');
  assert.equal(created.assessment.score, 62);
  assert.equal(created.resources.length, 6);
  assert.equal(Object.hasOwn(created, 'name'), false);

  const queue = await (await fetch(`${baseUrl}/api/cases`)).json();
  assert.equal(queue.cases.length, 1);

  const reviewResponse = await fetch(`${baseUrl}/api/cases/${created.id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'approved', reviewer: 'reviewer-1', notes: 'Human review complete.' })
  });
  assert.equal(reviewResponse.status, 200);
  assert.equal((await reviewResponse.json()).case.status, 'approved');

  const duplicateResponse = await fetch(`${baseUrl}/api/cases/${created.id}/review`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decision: 'declined', reviewer: 'reviewer-1', notes: 'Duplicate.' })
  });
  assert.equal(duplicateResponse.status, 400);
});

test('local API rejects invalid intake values and unknown resources', async (t) => {
  const server = createAppServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const invalidScoreResponse = await fetch(`${baseUrl}/api/intakes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores: { ...scores, housing: 101 }, needs: [] })
  });
  assert.equal(invalidScoreResponse.status, 400);

  const invalidNeedResponse = await fetch(`${baseUrl}/api/intakes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ scores, needs: ['unknown'] })
  });
  assert.equal(invalidNeedResponse.status, 400);
});
