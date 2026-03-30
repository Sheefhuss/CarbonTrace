const { AuditLog } = require('../models');

const createAuditLog = async (userId, action, resourceType = null, resourceId = null, metadata = {}, req = null) => {
  try {
    let ipAddress = null;
    let userAgent = null;

    if (req) {
      ipAddress = req.ip || req.connection?.remoteAddress || null;
      userAgent = req.get('User-Agent') || null;
    }

    await AuditLog.create({
      userId,
      action,
      resourceType,
      resourceId,
      metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    console.error('Failed to save audit log:', error.message);
  }
};

module.exports = { createAuditLog };