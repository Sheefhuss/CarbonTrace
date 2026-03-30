require('dotenv').config();
const { sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    const cols = [
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "username" VARCHAR(20) UNIQUE`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "avatarIndex" INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "weeklyEmailEnabled" BOOLEAN DEFAULT true`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "weeklyGoalKg" FLOAT`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "longestStreak" INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "earnedBadges" JSONB DEFAULT '[]'`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "completedChallenges" JSONB DEFAULT '[]'`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "weeklyPoints" INTEGER DEFAULT 0`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "lastWeeklyReset" DATE`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "friendCode" VARCHAR(8) UNIQUE`,
      `ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "friends" JSONB DEFAULT '[]'`,
    ];

    for (const sql of cols) {
      await sequelize.query(sql);
      const colName = sql.match(/"(\w+)"/g)?.[1] || '';
      console.log(`Added ${colName}`);
    }

    const crypto = require('crypto');
    const { User } = require('./models');
    const users = await User.unscoped().findAll({ where: { friendCode: null } });
    console.log(`Generating friend codes for ${users.length} existing users...`);

    for (const u of users) {
      let code = crypto.randomBytes(4).toString('hex').toUpperCase();
      let exists = await User.unscoped().findOne({ where: { friendCode: code } });
      while (exists) {
        code = crypto.randomBytes(4).toString('hex').toUpperCase();
        exists = await User.unscoped().findOne({ where: { friendCode: code } });
      }
      const base = (u.name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 10);
      const suffix = Math.floor(Math.random() * 9000) + 1000;
      const username = u.username || `${base}${suffix}`;
      await u.update({ friendCode: code, username });
    }

    console.log('\nAll done! Migration complete.');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
})();
