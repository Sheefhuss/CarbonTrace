// FILE: backend/models/ScopeReport.js
// FIX: Removed duplicate scope1/scope2/scope3 columns (were duplicates of scope1Emissions etc.)
// Now uses scope1Emissions, scope2Emissions, scope3Emissions consistently everywhere.

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
    // FIX: removed duplicate scope1/scope2/scope3 — use only these:
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