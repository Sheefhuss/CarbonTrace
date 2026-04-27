const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('ScopeReport', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizationId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    reportingPeriod: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.INTEGER,
    },
    periodStart: {
      type: DataTypes.DATEONLY,
    },
    periodEnd: {
      type: DataTypes.DATEONLY,
    },
    scope1Emissions: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    scope2Emissions: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    scope3Emissions: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalEmissions: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    scope1Breakdown: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    scope2Breakdown: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    scope3Breakdown: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
    status: {
      type: DataTypes.ENUM('draft', 'submitted', 'verified'),
      defaultValue: 'draft',
    },
    submittedAt: {
      type: DataTypes.DATE,
    },
    verifiedAt: {
      type: DataTypes.DATE,
    },
  }, {
    timestamps: true,
  });
};
