const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const writeAuditLog = async (req, action, entityType, entityId, changes, metadata) => {
  try {
    const actor = req?.user?._id;
    const requestId = req?.id;
    const ipAddress = req?.ip || '127.0.0.1';
    const userAgent = typeof req?.get === 'function' ? req.get('user-agent') : (req?.userAgent || 'system');

    await AuditLog.create({
      actor,
      action,
      entityType,
      entityId,
      changes,
      metadata,
      requestId,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    logger.error('Failed to persist audit log', { action, entityType, entityId, error: error.message });
  }
};

module.exports = { writeAuditLog };
