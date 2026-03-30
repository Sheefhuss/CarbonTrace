require('dotenv').config();
const { sequelize, User, EmissionEntry, AuditLog, ScopeReport, CarbonCredit } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const users = await User.unscoped().findAll();
    console.log(`Found ${users.length} users to delete`);

    for (const u of users) {
      await EmissionEntry.destroy({ where: { userId: u.id }, force: true });
      await AuditLog.destroy({ where: { userId: u.id }, force: true });
      await CarbonCredit.destroy({ where: { userId: u.id }, force: true }).catch(() => {});
      await u.destroy({ force: true });
    }

    await ScopeReport.destroy({ where: {}, force: true }).catch(() => {});

    console.log(`Deleted ${users.length} users and all their data`);
    console.log('Database is now clean — register fresh users');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();
