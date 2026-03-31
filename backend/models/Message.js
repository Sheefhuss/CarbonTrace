const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('Message', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  senderId: { type: DataTypes.UUID, allowNull: false },
  receiverId: { type: DataTypes.UUID, allowNull: false },
  text: { type: DataTypes.TEXT, allowNull: false },
  readAt: { type: DataTypes.DATE, allowNull: true },
}, {
  tableName: 'messages',
  timestamps: true,
});
