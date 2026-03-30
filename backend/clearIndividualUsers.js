require('dotenv').config();
const { sequelize, User, EmissionEntry, AuditLog } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected');

    const users = await User.unscoped().findAll({ where: { role: 'individual' } });
    console.log(`Found ${users.length} individual users to delete`);

    for (const u of users) {
      await EmissionEntry.destroy({ where: { userId: u.id }, force: true });
      await AuditLog.destroy({ where: { userId: u.id }, force: true });
      await u.destroy({ force: true });
    }

    console.log(`Deleted ${users.length} users and their data`);
    console.log('Business admin accounts are untouched');
    console.log('Done — register fresh users now');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();
