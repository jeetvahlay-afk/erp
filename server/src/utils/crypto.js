const crypto = require('crypto');
const env = require('../config/env');
const { SENSITIVE_SETTING_PATTERN } = require('../constants/security');

const key = crypto.createHash('sha256').update(env.settingsEncryptionKey).digest();
const PREFIX = 'enc:v1:';
const MASK = '••••••••';

const encryptString = (value) => {
  if (typeof value !== 'string' || !value || value.startsWith(PREFIX)) return value;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
};

const decryptString = (value) => {
  if (typeof value !== 'string' || !value.startsWith(PREFIX)) return value;
  const payload = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const encrypted = payload.subarray(28);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
};

const transformSensitive = (input, mode, existing) => {
  if (Array.isArray(input)) {
    const existingItems = Array.isArray(existing) ? existing : (existing && typeof existing === 'object' ? [existing] : []);
    return input.map((item, index) => {
      const matched = item && typeof item === 'object' && item.id !== undefined
        ? existingItems.find((candidate) => String(candidate?.id) === String(item.id))
        : undefined;
      return transformSensitive(item, mode, matched || existingItems[index]);
    });
  }
  if (!input || typeof input !== 'object') return input;

  return Object.entries(input).reduce((result, [field, value]) => {
    if (SENSITIVE_SETTING_PATTERN.test(field) && typeof value === 'string') {
      if (mode === 'encrypt') {
        result[field] = value === MASK && existing?.[field] ? encryptString(existing[field]) : encryptString(value);
      } else if (mode === 'mask') {
        result[field] = value ? MASK : '';
      } else {
        result[field] = decryptString(value);
      }
    } else {
      result[field] = transformSensitive(value, mode, existing?.[field]);
    }
    return result;
  }, {});
};

module.exports = { MASK, transformSensitive };
