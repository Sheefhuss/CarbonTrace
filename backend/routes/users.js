const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { User, Message, EmissionEntry } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/friends', async (req, res, next) => {
  try {
    const me = await User.findByPk(req.user.id);
    const friends = await User.findAll({
      where: { id: { [Op.in]: me.friends || [] } },
      attributes: ['id', 'name', 'username', 'avatarIndex', 'points', 'streakDays', 'friendCode']
    });
    res.json(friends);
  } catch (err) { next(err); }
});

router.post('/connect-friend', [
  body('friendCode').trim().notEmpty().toUpperCase(),
], async (req, res, next) => {
  try {
    const { friendCode } = req.body;
    const me = await User.findByPk(req.user.id);
    const friend = await User.findOne({ where: { friendCode: friendCode.toUpperCase() } });

    if (!friend) return res.status(404).json({ error: 'User not found' });
    if (friend.id === me.id) return res.status(400).json({ error: 'Cannot add yourself' });

    const myFriends = me.friends || [];
    if (myFriends.includes(friend.id)) return res.status(400).json({ error: 'Already friends' });

    await me.update({ friends: [...myFriends, friend.id] });
    const theirFriends = friend.friends || [];
    if (!theirFriends.includes(me.id)) await friend.update({ friends: [...theirFriends, me.id] });

    res.json({ message: `Connected with ${friend.name}` });
  } catch (err) { next(err); }
});

router.get('/messages/unread-counts', async (req, res, next) => {
  try {
    const unread = await Message.findAll({
      where: { receiverId: req.user.id, readAt: null },
      attributes: ['senderId', [fn('COUNT', col('id')), 'count']],
      group: ['senderId']
    });
    const counts = {};
    unread.forEach(r => { counts[r.senderId] = parseInt(r.get('count'), 10); });
    res.json(counts);
  } catch (err) { next(err); }
});

router.get('/messages/:friendId', async (req, res, next) => {
  try {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.id, receiverId: req.params.friendId },
          { senderId: req.params.friendId, receiverId: req.user.id }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages);
  } catch (err) { next(err); }
});

router.post('/messages/:friendId', async (req, res, next) => {
  try {
    const message = await Message.create({
      senderId: req.user.id,
      receiverId: req.params.friendId,
      text: req.body.text
    });
    res.status(201).json(message);
  } catch (err) { next(err); }
});

router.delete('/messages/:messageId', async (req, res, next) => {
  try {
    const message = await Message.findByPk(req.params.messageId);
    if (message && message.senderId === req.user.id) {
      await message.destroy();
      return res.json({ success: true });
    }
    res.status(403).json({ error: 'Unauthorized' });
  } catch (err) { next(err); }
});

module.exports = router;
