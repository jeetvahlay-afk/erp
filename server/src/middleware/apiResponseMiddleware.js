const normalizePayload = (payload) => {
  if (payload === undefined) return { data: null };
  if (payload === null || Array.isArray(payload)) return { data: payload };
  if (typeof payload !== 'object') return { data: payload };

  // Mongoose documents keep their public fields inside `_doc` until `toJSON`
  // runs. Because this middleware inspects payloads before Express serializes
  // them, normalize documents first so API clients receive model fields rather
  // than Mongoose's internal state.
  const serializablePayload = typeof payload.toJSON === 'function'
    ? payload.toJSON()
    : payload;

  const {
    message,
    pagination,
    meta,
    errors,
    ...rest
  } = serializablePayload;

  if (Object.prototype.hasOwnProperty.call(rest, 'items')) {
    const { items, ...additional } = rest;
    return {
      message,
      data: items,
      pagination,
      meta: Object.keys(additional).length ? { ...meta, ...additional } : meta,
      errors,
    };
  }

  const keys = Object.keys(rest);
  if (keys.length === 1 && ['data', 'user', 'record', 'leave', 'schedule', 'config'].includes(keys[0])) {
    return { message, data: rest[keys[0]], pagination, meta, errors };
  }

  return {
    message,
    data: keys.length ? rest : null,
    pagination,
    meta,
    errors,
  };
};

const apiResponseMiddleware = (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = (payload) => {
    if (payload?.__skipEnvelope) {
      return originalJson(payload.data);
    }

    // Check if payload is already a standard envelope: { success: true/false, ... }
    const isStandardEnvelope = payload
      && typeof payload === 'object'
      && typeof payload.success === 'boolean'
      && Object.prototype.hasOwnProperty.call(payload, 'data');

    if (isStandardEnvelope) {
      return originalJson({
        success: payload.success,
        code: payload.code,
        message: payload.message || (payload.success ? 'Request completed successfully' : 'Request failed'),
        data: payload.data,
        pagination: payload.pagination ?? null,
        meta: {
          requestId: req.id,
          ...(payload.meta || {}),
        },
        errors: payload.errors ?? null,
        timestamp: payload.timestamp || new Date().toISOString(),
      });
    }

    const normalized = normalizePayload(payload);
    const response = {
      success: res.statusCode < 400,
      message: normalized.message || (res.statusCode < 400 ? 'Request completed successfully' : 'Request failed'),
      data: normalized.data ?? null,
      pagination: normalized.pagination ?? null,
      meta: {
        requestId: req.id,
        ...(normalized.meta || {}),
      },
      errors: normalized.errors ?? null,
      timestamp: new Date().toISOString(),
    };
    return originalJson(response);
  };

  next();
};

module.exports = apiResponseMiddleware;
