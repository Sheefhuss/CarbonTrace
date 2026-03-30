const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Organization', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    industry: {
      type: DataTypes.STRING,
    },
    country: {
      type: DataTypes.STRING,
    }
  }, { timestamps: true });
};