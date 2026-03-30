const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CarbonCredit = sequelize.define('CarbonCredit', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    projectType: {
      type: DataTypes.STRING,
    },
    provider: {
      type: DataTypes.STRING,
    },
    verificationBody: {
      type: DataTypes.STRING,
    },
    serialNumber: {
      type: DataTypes.STRING,
      unique: true,
    },
    quantityTons: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    creditsAvailable: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    pricePerTon: {
      type: DataTypes.FLOAT,
    },
    pricePerCredit: {
      type: DataTypes.FLOAT,
    },
    totalPriceUsd: {
      type: DataTypes.FLOAT,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'USD',
    },
    status: {
      type: DataTypes.ENUM('active', 'retired'),
      defaultValue: 'active',
    },
    description: {
      type: DataTypes.TEXT,
    },
    purchasedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    retiredAt: {
      type: DataTypes.DATE,
    },
  }, {
    timestamps: true,
  });

  return CarbonCredit;
};