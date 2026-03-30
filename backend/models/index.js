const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// ─── Initialize Sequelize with Neon DATABASE_URL and SSL ──────────────
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false // Required for Neon cloud database
    }
  },
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') logger.debug(msg);
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

// ─── Model Imports ─────────────────────────────────────────────────────────────
const User = require('./User')(sequelize);
const Activity = require('./Activity')(sequelize);
const EmissionEntry = require('./EmissionEntry')(sequelize);
const CarbonCredit = require('./CarbonCredit')(sequelize);
const Organization = require('./Organization')(sequelize);
const ScopeReport = require('./ScopeReport')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);

// ─── Associations ──────────────────────────────────────────────────────────────

// User ↔ Organization (B2B)
User.belongsTo(Organization, { foreignKey: 'organizationId', as: 'organization' });
Organization.hasMany(User, { foreignKey: 'organizationId', as: 'members' });

// User → EmissionEntry
User.hasMany(EmissionEntry, { foreignKey: 'userId', as: 'emissions' });
EmissionEntry.belongsTo(User, { foreignKey: 'userId' });

// Activity → EmissionEntry (template/category reference)
Activity.hasMany(EmissionEntry, { foreignKey: 'activityId', as: 'entries' });
EmissionEntry.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

// Organization → ScopeReport
Organization.hasMany(ScopeReport, { foreignKey: 'organizationId', as: 'scopeReports' });
ScopeReport.belongsTo(Organization, { foreignKey: 'organizationId' });

// User → CarbonCredit purchases
User.hasMany(CarbonCredit, { foreignKey: 'userId', as: 'credits' });
CarbonCredit.belongsTo(User, { foreignKey: 'userId' });

// User → AuditLog
User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

module.exports = {
  sequelize,
  User,
  Activity,
  EmissionEntry,
  CarbonCredit,
  Organization,
  ScopeReport,
  AuditLog,
};
