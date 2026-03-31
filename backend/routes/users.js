const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { User, Message, EmissionEntry } = require('../models');
const { authenticate } = require('../middleware/auth');
const router = express.Router();
router.use(authenticate);

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
    if (!message) return res.status(404).json({ error: 'Not found' });
    if (message.senderId !== req.user.id) return res.status(403).json({ error: 'Unauthorized' });
    await message.destroy();
    res.json({ success: true });
  } catch (err) { next(err); }
});

module.exports = router;
