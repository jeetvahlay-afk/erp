const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');

const writeAuditLog = async (req, action, entityType, entityId, changes, metadata) => {
  try {
    await AuditLog.create({
      actor: req.user?._id,
      action,
      entityType,
      entityId,
      changes,
      metadata,
      requestId: req.id,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  } catch (error) {
    logger.error('Failed to persist audit log', { action, entityType, entityId, error: error.message });
  }
};

module.exports = { writeAuditLog };
