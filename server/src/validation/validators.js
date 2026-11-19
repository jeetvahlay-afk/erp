const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

const ensure = (condition, message, field) => {
  if (!condition) throw new AppError(message, 400, 'VALIDATION_ERROR', field ? { field } : undefined);
};

const requiredString = (value, field, options = {}) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  ensure(normalized.length > 0, `${field} is required`, field);
  if (options.min) ensure(normalized.length >= options.min, `${field} must be at least ${options.min} characters`, field);
  if (options.max) ensure(normalized.length <= options.max, `${field} must not exceed ${options.max} characters`, field);
  return normalized;
};

const optionalString = (value, field, options = {}) => {
  if (value === undefined || value === null || value === '') return undefined;
  const normalized = String(value).trim();
  if (options.max) ensure(normalized.length <= options.max, `${field} must not exceed ${options.max} characters`, field);
  return normalized;
};

const email = (value) => {
  const normalized = requiredString(value, 'email', { max: 254 }).toLowerCase();
  ensure(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized), 'A valid email address is required', 'email');
  return normalized;
};

const password = (value) => {
  const normalized = requiredString(value, 'password', { min: 8, max: 128 });
  ensure(/[A-Za-z]/.test(normalized) && /\d/.test(normalized), 'Password must contain at least one letter and one number', 'password');
  return normalized;
};

const objectId = (value, field = 'id') => {
  ensure(mongoose.isValidObjectId(value), `Invalid ${field}`, field);
  return value;
};

const enumValue = (value, allowed, field) => {
  ensure(allowed.includes(value), `${field} must be one of: ${allowed.join(', ')}`, field);
  return value;
};

const number = (value, field, options = {}) => {
  const parsed = Number(value);
  ensure(Number.isFinite(parsed), `${field} must be a valid number`, field);
  if (options.min !== undefined) ensure(parsed >= options.min, `${field} must be at least ${options.min}`, field);
  if (options.max !== undefined) ensure(parsed <= options.max, `${field} must not exceed ${options.max}`, field);
  return parsed;
};

module.exports = { ensure, requiredString, optionalString, email, password, objectId, enumValue, number };
