const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teamhub_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-with-at-least-thirty-two-characters';
process.env.CORS_ORIGINS = 'http://localhost:5173';

const app = require('../src/app');

const assertEnvelope = (body, success) => {
  assert.equal(body.success, success);
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'data'));
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'pagination'));
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'meta'));
  assert.ok(Object.prototype.hasOwnProperty.call(body, 'errors'));
  assert.match(body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
};

test('GET / exposes API metadata without server internals', async () => {
  const response = await request(app).get('/').expect(200);
  assertEnvelope(response.body, true);
  assert.equal(response.body.data.name, 'TeamHub ERP API');
  assert.equal(response.body.data.version, '3.0.0');
  assert.equal(response.headers['x-powered-by'], undefined);
  assert.ok(response.headers['x-request-id']);
});

test('health endpoint reports degraded when database is disconnected', async () => {
  const response = await request(app).get('/api/health').expect(503);
  assertEnvelope(response.body, false);
  assert.equal(response.body.data.status, 'degraded');
  assert.equal(response.body.data.database, 'disconnected');
  assert.match(response.body.timestamp, /^\d{4}-\d{2}-\d{2}T/);
});

test('unknown endpoint returns the normalized error contract', async () => {
  const response = await request(app).get('/api/not-a-route').expect(404);
  assertEnvelope(response.body, false);
  assert.equal(response.body.errors[0].code, 'ROUTE_NOT_FOUND');
  assert.match(response.body.message, /^Route not found:/);
  assert.ok(response.body.meta.requestId);
});

test('CORS allows configured origins and blocks unknown origins', async () => {
  await request(app)
    .get('/')
    .set('Origin', 'http://localhost:5173')
    .expect('access-control-allow-origin', 'http://localhost:5173')
    .expect(200);

  const response = await request(app)
    .get('/')
    .set('Origin', 'https://untrusted.invalid')
    .expect(403);
  assert.equal(response.body.errors[0].code, 'CORS_BLOCKED');
});


test('cookie-authenticated state changes require a matching CSRF token', async () => {
  const missingToken = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', ['teamhub.sid=fake-session'])
    .expect(403);
  assert.equal(missingToken.body.errors[0].code, 'CSRF_VALIDATION_FAILED');

  const matchingToken = await request(app)
    .post('/api/auth/logout')
    .set('Cookie', ['teamhub.sid=fake-session', 'teamhub.csrf=test-csrf'])
    .set('X-CSRF-Token', 'test-csrf')
    .expect(401);
  assert.equal(matchingToken.body.errors[0].code, 'INVALID_TOKEN');
});

test('password recovery endpoints validate untrusted input', async () => {
  const forgot = await request(app).post('/api/auth/forgot-password').send({ email: 'not-an-email' }).expect(400);
  assert.equal(forgot.body.errors[0].code, 'VALIDATION_ERROR');
  const reset = await request(app).post('/api/auth/reset-password').send({ token: 'invalid', password: 'weak' }).expect(400);
  assert.equal(reset.body.errors[0].code, 'VALIDATION_ERROR');
});
