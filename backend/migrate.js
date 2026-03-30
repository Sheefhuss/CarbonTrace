require('dotenv').config();
const { sequelize } = require('./models');

(async () => {
  try {
    await sequelize.authenticate();
    console.log('Connected to database');

    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "weeklyEmailEnabled" BOOLEAN DEFAULT true`);
    console.log('Added weeklyEmailEnabled');

    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "weeklyGoalKg" FLOAT`);
    console.log('Added weeklyGoalKg');

    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "longestStreak" INTEGER DEFAULT 0`);
    console.log('Added longestStreak');

    await sequelize.query(`ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "earnedBadges" JSONB DEFAULT '[]'`);
    console.log('Added earnedBadges');

    console.log('\nAll columns added successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Failed:', err.message);
    process.exit(1);
  }
})();