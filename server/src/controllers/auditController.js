const AuditLog = require('../models/AuditLog');
const asyncHandler = require('../utils/asyncHandler');

const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const query = {};
  if (req.query.action) query.action = req.query.action;
  if (req.query.entityType) query.entityType = req.query.entityType;

  const [items, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actor', 'name employeeId email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);
  res.json({ items, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
});

module.exports = { getAuditLogs };
