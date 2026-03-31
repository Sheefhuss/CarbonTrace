const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { User, Message, EmissionEntry, AuditLog } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../utils/audit');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

const pickPublic = (u) => ({
  id: u.id,
  name: u.name,
  username: u.username,
  avatarIndex: u.avatarIndex,
  country: u.country,
  points: u.points,
  weeklyPoints: u.weeklyPoints,
  streakDays: u.streakDays,
  longestStreak: u.longestStreak,
  totalOffsetKg: u.totalOffsetKg,
  earnedBadges: u.earnedBadges,
  friendCode: u.friendCode,
});

router.get('/friends', async (req, res, next) => {
  try {
    const me = await User.unscoped().findByPk(req.user.id);
    const friendIds = me.friends || [];
    if (!friendIds.length) return res.json([]);
    const friends = await User.unscoped().findAll({
      where: { id: { [Op.in]: friendIds } },
      attributes: ['id', 'name', 'username', 'avatarIndex', 'country', 'points', 'weeklyPoints', 'streakDays', 'totalOffsetKg', 'earnedBadges', 'friendCode'],
    });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const enriched = await Promise.all(friends.map(async (f) => {
      const monthKg = await EmissionEntry.sum('co2eKg', {
        where: { userId: f.id, date: { [Op.gte]: startOfMonth } },
      });
      return { ...pickPublic(f), monthKg: monthKg || 0 };
    }));
    res.json(enriched);
  } catch (err) { next(err); }
});

router.get('/messages/unread-counts', async (req, res, next) => {
  try {
    const unreadMessages = await Message.findAll({
      where: { receiverId: req.user.id, readAt: null },
      attributes: ['senderId', [fn('COUNT', col('id')), 'count']],
      group: ['senderId']
    });
    const counts = {};
    unreadMessages.forEach(record => {
      counts[record.senderId] = parseInt(record.get('count'), 10);
    });
    res.json(counts);
  } catch (err) { next(err); }
});

router.get('/messages/:friendId', async (req, res, next) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: req.params.friendId },
          { senderId: req.params.friendId, receiverId: req.user.id },
        ],
      },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });
    res.json(messages);
  } catch (err) { next(err); }
});

router.post('/messages/:friendId', [
  body('text').trim().notEmpty().isLength({ max: 1000 }),
], async (req, res, next) => {
  try {
    const message = await Message.create({
      senderId: req.user.id,
      receiverId: req.params.friendId,
      text: req.body.text,
    });
    res.status(201).json(message);
  } catch (err) { next(err); }
});

router.delete('/messages/:messageId', async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (!message || message.senderId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    await message.destroy();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
