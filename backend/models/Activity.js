const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Activity = sequelize.define('Activity', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, unique: true, allowNull: false },
    category: { type: DataTypes.STRING, allowNull: false },
    subCategory: { type: DataTypes.STRING },
    unit: { type: DataTypes.STRING, allowNull: false },
    emissionFactor: { type: DataTypes.FLOAT, allowNull: false },
    description: { type: DataTypes.TEXT },
    regionalFactors: { type: DataTypes.JSONB, defaultValue: {} },
    icon: { type: DataTypes.STRING },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    climatiqActivityId: { type: DataTypes.STRING },
  }, {
    timestamps: true,
  });

  return Activity;
};