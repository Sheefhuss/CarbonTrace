const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('EmissionEntry', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  activityId: {
    type: DataTypes.UUID,
    allowNull: true, // null = custom entry
  },
  // Classification
  category: {
    type: DataTypes.ENUM('housing', 'transport', 'food', 'shopping', 'industrial', 'other'),
    allowNull: false,
  },
  subCategory: {
    type: DataTypes.STRING,
    comment: 'e.g. "electricity", "petrol_car", "beef", "flight_economy"',
  },
  // B2B Scope
  scope: {
    type: DataTypes.ENUM('scope1', 'scope2', 'scope3'),
    allowNull: true, // only for business users
  },
  // Measurement
  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Raw value — e.g. 50 (kWh), 200 (km)',
  },
  unit: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g. kwh, km, kg, litre',
  },
  emissionFactor: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'kg CO2e per unit',
  },
  co2eKg: {
    type: DataTypes.FLOAT,
    allowNull: false,
    comment: 'Total kg CO2 equivalent = quantity * emissionFactor',
  },
  // Metadata
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  notes: { type: DataTypes.TEXT },
  source: {
    type: DataTypes.ENUM('manual', 'api', 'import', 'quiz'),
    defaultValue: 'manual',
  },
  // For audit compliance
  verifiedAt: { type: DataTypes.DATE },
  verifiedBy: { type: DataTypes.UUID },
}, {
  timestamps: true,
  indexes: [
    { fields: ['userId', 'date'] },
    { fields: ['userId', 'category'] },
    { fields: ['date'] },
  ],
});
