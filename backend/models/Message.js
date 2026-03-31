const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  senderId: { type: DataTypes.INTEGER, allowNull: false },
  receiverId: { type: DataTypes.INTEGER, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
}, {
  tableName: 'messages',
  timestamps: true,
});
