const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const asList = (value, fallback = []) => {
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
};

const nodeEnv = process.env.NODE_ENV || 'development';
const required = ['MONGO_URI', 'JWT_SECRET'];
if (nodeEnv === 'production') required.push('SETTINGS_ENCRYPTION_KEY');
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
}

if (nodeEnv === 'production' && process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must contain at least 32 characters in production');
}

const corsOrigins = asList(process.env.CORS_ORIGINS, ['http://localhost:5173', 'http://localhost:3000']);

const cookieSecure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : nodeEnv === 'production';
const cookieSameSite = ['lax', 'strict', 'none'].includes(process.env.COOKIE_SAME_SITE)
  ? process.env.COOKIE_SAME_SITE
  : 'lax';
if (cookieSameSite === 'none' && !cookieSecure) {
  throw new Error('COOKIE_SECURE must be true when COOKIE_SAME_SITE is none');
}

const env = Object.freeze({
  nodeEnv,
  isProduction: nodeEnv === 'production',
  port: asNumber(process.env.PORT, 5000),
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  jwtRememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || '30d',
  rememberCookieDays: Math.min(Math.max(asNumber(process.env.REMEMBER_COOKIE_DAYS, 30), 1), 90),
  bcryptRounds: Math.min(Math.max(asNumber(process.env.BCRYPT_ROUNDS, 12), 10), 14),
  corsOrigins,
  appBaseUrl: process.env.APP_BASE_URL || corsOrigins[0],
  trustProxy: process.env.TRUST_PROXY === 'true',
  requestBodyLimit: process.env.REQUEST_BODY_LIMIT || '1mb',
  uploadMaxBytes: asNumber(process.env.UPLOAD_MAX_BYTES, 5 * 1024 * 1024),
  shiftDayCutoffHour: Math.min(Math.max(asNumber(process.env.SHIFT_DAY_CUTOFF_HOUR, 10), 0), 23),
  settingsEncryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET,
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'teamhub.sid',
  csrfCookieName: process.env.CSRF_COOKIE_NAME || 'teamhub.csrf',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure,
  cookieSameSite,
  smtpHost: process.env.SMTP_HOST || '',
  smtpPort: asNumber(process.env.SMTP_PORT, 587),
  smtpSecure: process.env.SMTP_SECURE === 'true',
  smtpUser: process.env.SMTP_USER || '',
  smtpPass: process.env.SMTP_PASS || '',
  smtpFromName: process.env.SMTP_FROM_NAME || 'Vahlay Consulting',
  smtpFromEmail: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER || '',
  assessmentApiKey: process.env.ASSESSMENT_API_KEY || 'vahlay_assessment_sec_9f81a7b538e124d9c',
});

module.exports = env;
