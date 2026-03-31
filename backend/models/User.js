const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
  },
  passwordHash: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  username: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Public display handle e.g. @eco_ravi — never exposes email',
  },
  avatarIndex: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    comment: '0-14 — index into the cartoon avatar array on the frontend',
  },
  role: {
    type: DataTypes.ENUM('individual', 'business_admin', 'business_member', 'admin'),
    defaultValue: 'individual',
  },
  organizationId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  country: { type: DataTypes.STRING(5), defaultValue: 'IND' },
  region: { type: DataTypes.STRING },
  baselineFootprint: { type: DataTypes.FLOAT },
  streakDays: { type: DataTypes.INTEGER, defaultValue: 0 },
  longestStreak: { type: DataTypes.INTEGER, defaultValue: 0 },
  totalOffsetKg: { type: DataTypes.FLOAT, defaultValue: 0 },
  points: { type: DataTypes.INTEGER, defaultValue: 0 },
  weeklyPoints: { type: DataTypes.INTEGER, defaultValue: 0 },
  lastActiveDate: { type: DataTypes.DATEONLY },
  lastWeeklyReset: { type: DataTypes.DATEONLY },
  earnedBadges: { type: DataTypes.JSONB, defaultValue: [] },
  completedChallenges: { type: DataTypes.JSONB, defaultValue: [] },
  weeklyGoalKg: { type: DataTypes.FLOAT, allowNull: true },
  friendCode: {
    type: DataTypes.STRING(8),
    comment: '8-char uppercase code users share to connect as friends',
  },
  friends: {
    type: DataTypes.JSONB,
    defaultValue: [],
    comment: 'Array of user IDs this user is connected with',
  },
  emailNotifications: { type: DataTypes.BOOLEAN, defaultValue: true },
  weeklyEmailEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verificationToken: { type: DataTypes.STRING },
  resetPasswordToken: { type: DataTypes.STRING },
  resetPasswordExpires: { type: DataTypes.DATE },
}, {
  timestamps: true,
  paranoid: true,
  defaultScope: {
    attributes: {
      exclude: ['passwordHash', 'verificationToken', 'resetPasswordToken', 'email'],
    },
  },
  scopes: {
    withPassword: { attributes: {} },
    withEmail: { attributes: { exclude: ['passwordHash', 'verificationToken', 'resetPasswordToken'] } },
  },
  indexes: [
    { unique: true, fields: ['friendCode'], where: { friendCode: { [require('sequelize').Op.ne]: null } } },
    { unique: true, fields: ['email'] },
  ],
});
