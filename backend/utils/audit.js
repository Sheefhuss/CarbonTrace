const { AuditLog } = require('../models');

const createAuditLog = async (userId, action, resourceType = null, resourceId = null, metadata = {}, req = null) => {
  try {
    let ipAddress = null;
    let userAgent = null;

    // Grab the user's IP and Browser info if available
    if (req) {
      ipAddress = req.ip || req.connection?.remoteAddress;
      userAgent = req.get('User-Agent');
    }

    // Save the log to the database
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
    console.error('Failed to save audit log:', error);
  }
};

module.exports = { createAuditLog };