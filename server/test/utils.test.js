const test = require('node:test');
const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/teamhub_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-with-at-least-thirty-two-characters';
process.env.SHIFT_DAY_CUTOFF_HOUR = '10';

const pick = require('../src/utils/pick');
const { isIsoDate, isIsoMonth, logicalShiftWindow } = require('../src/utils/date');
const { MASK, transformSensitive } = require('../src/utils/crypto');
const { permissionsForRoutes, sanitizeRoutes } = require('../src/utils/routePermissions');
const { authorize, authorizeAccess } = require('../src/middleware/authMiddleware');

test('pick permits only explicitly allowed fields', () => {
  const result = pick({ name: 'A', role: 'admin', password: 'secret' }, ['name', 'role']);
  assert.deepEqual(result, { name: 'A', role: 'admin' });
});

test('date validators reject malformed values', () => {
  assert.equal(isIsoMonth('2026-07'), true);
  assert.equal(isIsoMonth('2026-13'), false);
  assert.equal(isIsoDate('2026-07-17'), true);
  assert.equal(isIsoDate('17-07-2026'), false);
});

test('logical shift window maps pre-cutoff activity to the previous business day', () => {
  const window = logicalShiftWindow(new Date(2026, 6, 17, 5, 30));
  assert.equal(window.logicalDate.getFullYear(), 2026);
  assert.equal(window.logicalDate.getMonth(), 6);
  assert.equal(window.logicalDate.getDate(), 16);
  assert.equal(window.start.getHours(), 10);
});

test('sensitive settings are encrypted and masked recursively', () => {
  const settings = {
    smtp: { username: 'mailer', password: 'very-secret' },
    integrations: [{ apiKey: 'abc123', endpoint: 'https://example.invalid' }],
  };
  const encrypted = transformSensitive(settings, 'encrypt');
  assert.match(encrypted.smtp.password, /^enc:v1:/);
  assert.match(encrypted.integrations[0].apiKey, /^enc:v1:/);
  assert.equal(encrypted.smtp.username, 'mailer');

  const masked = transformSensitive(encrypted, 'mask');
  assert.equal(masked.smtp.password, MASK);
  assert.equal(masked.integrations[0].apiKey, MASK);

  const decrypted = transformSensitive(encrypted, 'decrypt');
  assert.equal(decrypted.smtp.password, 'very-secret');
  assert.equal(decrypted.integrations[0].apiKey, 'abc123');
});


test('masked secrets remain associated with stable IDs when setting arrays are reordered', () => {
  const encrypted = transformSensitive([
    { id: 'primary', smtpPass: 'primary-secret' },
    { id: 'support', smtpPass: 'support-secret' },
  ], 'encrypt');
  const reorderedMaskedPayload = [
    { id: 'support', smtpPass: MASK },
    { id: 'primary', smtpPass: MASK },
  ];

  const preserved = transformSensitive(reorderedMaskedPayload, 'encrypt', encrypted);
  const decrypted = transformSensitive(preserved, 'decrypt');
  assert.equal(decrypted[0].smtpPass, 'support-secret');
  assert.equal(decrypted[1].smtpPass, 'primary-secret');
});


test('masked updates migrate legacy plaintext secrets into encrypted storage', () => {
  const preserved = transformSensitive({ smtpPass: MASK }, 'encrypt', { smtpPass: 'legacy-plaintext' });
  assert.match(preserved.smtpPass, /^enc:v1:/);
  assert.equal(transformSensitive(preserved, 'decrypt').smtpPass, 'legacy-plaintext');
});

test('route assignments accept known routes only and derive API permissions', () => {
  const routes = sanitizeRoutes(['/attendance', '/manage-leaves', '/unknown', '/manage-leaves']);
  assert.deepEqual(routes, ['/attendance', '/manage-leaves']);
  assert.deepEqual(permissionsForRoutes(routes).sort(), ['leaves.read', 'leaves.write']);
});

test('super admin bypasses every role and permission restriction', () => {
  const req = { user: { role: ' Super Admin ', permissions: [] } };
  let roleResult;
  let permissionResult;
  authorize('hr')(req, {}, (error) => { roleResult = error || 'allowed'; });
  authorizeAccess({ roles: ['hr'], permissions: ['unknown.permission'] })(req, {}, (error) => { permissionResult = error || 'allowed'; });
  assert.equal(roleResult, 'allowed');
  assert.equal(permissionResult, 'allowed');
});
