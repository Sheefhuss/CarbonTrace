const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false 
    }
  },
  logging: (msg) => {
    if (process.env.NODE_ENV === 'development') logger.debug(msg);
  },
  pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
});

const User = require('./User')(sequelize);
const Activity = require('./Activity')(sequelize);
const EmissionEntry = require('./EmissionEntry')(sequelize);
const CarbonCredit = require('./CarbonCredit')(sequelize);
const Organization = require('./Organization')(sequelize);
const ScopeReport = require('./ScopeReport')(sequelize);
const AuditLog = require('./AuditLog')(sequelize);
const Message = require('./Message')(sequelize);


User.hasMany(EmissionEntry, { foreignKey: 'userId', as: 'emissions' });
EmissionEntry.belongsTo(User, { foreignKey: 'userId' });

Activity.hasMany(EmissionEntry, { foreignKey: 'activityId', as: 'entries' });
EmissionEntry.belongsTo(Activity, { foreignKey: 'activityId', as: 'activity' });

Organization.hasMany(ScopeReport, { foreignKey: 'organizationId', as: 'scopeReports' });
ScopeReport.belongsTo(Organization, { foreignKey: 'organizationId' });

User.hasMany(CarbonCredit, { foreignKey: 'userId', as: 'credits' });
CarbonCredit.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AuditLog, { foreignKey: 'userId', as: 'auditLogs' });
AuditLog.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Message, { foreignKey: 'senderId', as: 'sentMessages' });
User.hasMany(Message, { foreignKey: 'receiverId', as: 'receivedMessages' });
Message.belongsTo(User, { foreignKey: 'senderId', as: 'sender' });
Message.belongsTo(User, { foreignKey: 'receiverId', as: 'receiver' });

module.exports = {
  sequelize,
  User,
  Activity,
  EmissionEntry,
  CarbonCredit,
  Organization,
  ScopeReport,
  AuditLog,
  Message,
};
