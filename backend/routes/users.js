
const express = require('express');
const { body, param, validationResult } = require('express-validator');
const { Op, fn, col } = require('sequelize');
const { User, AuditLog, EmissionEntry, Message } = require('../models');
const { authenticate } = require('../middleware/auth');
const { createAuditLog } = require('../utils/audit');
const { AppError } = require('../middleware/errorHandler');

const router = express.Router();
router.use(authenticate);

// FIX: added friend_made: 20
const BADGE_POINTS = {
  first_log: 20, week_streak: 50, month_streak: 150,
  ten_logs: 30, fifty_logs: 100, below_avg: 40,
  paris_hero: 80, offset_1t: 100, quiz_done: 25,
  veg_week: 50, no_car: 40, century: 0,
  friend_made: 20,
};

const CHALLENGE_POINTS = {
  no_meat_week: 60, green_commute: 50, log_streak: 40, light_month: 80,
  cycle_hero: 45, vegan_day: 35, zero_waste_week: 55, solar_saver: 70,
};

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

router.get('/profile', async (req, res) => {
  const user = await User.unscoped().findByPk(req.user.id);
  res.json(user);
});

router.put('/profile', [
  body('name').optional().trim().notEmpty(),
  body('username').optional().trim().isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/),
  body('avatarIndex').optional().isInt({ min: 0, max: 14 }),
  body('country').optional().isLength({ min: 2, max: 5 }),
  body('region').optional().isString(),
  body('emailNotifications').optional().isBoolean(),
  body('weeklyEmailEnabled').optional().isBoolean(),
  body('weeklyGoalKg').optional().isFloat({ min: 0 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { name, username, avatarIndex, country, region, emailNotifications, weeklyEmailEnabled, weeklyGoalKg } = req.body;

    if (username && username !== req.user.username) {
      const taken = await User.unscoped().findOne({ where: { username, id: { [Op.ne]: req.user.id } } });
      if (taken) throw new AppError('Username already taken', 409);
    }

    await req.user.update({ name, username, avatarIndex, country, region, emailNotifications, weeklyEmailEnabled, weeklyGoalKg });
    const fresh = await User.unscoped().findByPk(req.user.id);
    res.json(fresh);
  } catch (err) {
    next(err);
  }
});

router.post('/connect-friend', [
  body('friendCode').trim().isLength({ min: 8, max: 8 }).toUpperCase(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { friendCode } = req.body;
    const me = await User.unscoped().findByPk(req.user.id);

    if (me.friendCode === friendCode.toUpperCase()) {
      throw new AppError('You cannot add yourself', 400);
    }

    const friend = await User.unscoped().findOne({ where: { friendCode: friendCode.toUpperCase() } });
    if (!friend) throw new AppError('No user found with that code. Check it and try again.', 404);

    const myFriends = me.friends || [];
    if (myFriends.includes(friend.id)) {
      throw new AppError('You are already connected with this person', 409);
    }

    await me.update({ friends: [...myFriends, friend.id] });
    const theirFriends = friend.friends || [];
    if (!theirFriends.includes(me.id)) {
      await friend.update({ friends: [...theirFriends, me.id] });
    }

    await createAuditLog(me.id, 'friend_connected', 'User', friend.id, { friendCode }, req);

    // FIX: Auto-award friend_made badge if not already earned
    const earnedBadges = me.earnedBadges || [];
    if (!earnedBadges.includes('friend_made')) {
      const pts = BADGE_POINTS['friend_made'];
      const newBadges = [...earnedBadges, 'friend_made'];
      await me.update({
        earnedBadges: newBadges,
        points: (me.points || 0) + pts,
        weeklyPoints: (me.weeklyPoints || 0) + pts,
      });
      await createAuditLog(me.id, 'badge_earned', 'User', me.id, { badgeId: 'friend_made', pts }, req);
    }

    res.json({
      message: `You are now connected with ${friend.name}!`,
      friend: pickPublic(friend),
    });
  } catch (err) {
    next(err);
  }
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
  } catch (err) {
    next(err);
  }
});

router.post('/award-badge', [
  body('badgeId').notEmpty(),
], async (req, res, next) => {
  try {
    const { badgeId } = req.body;
    const user = await User.unscoped().findByPk(req.user.id);
    const current = user.earnedBadges || [];
    if (current.includes(badgeId)) {
      return res.json({ alreadyEarned: true, badges: current, points: user.points });
    }

    const pts = BADGE_POINTS[badgeId] || 10;
    const newBadges = [...current, badgeId];
    await user.update({
      earnedBadges: newBadges,
      points: (user.points || 0) + pts,
      weeklyPoints: (user.weeklyPoints || 0) + pts,
    });
    await createAuditLog(user.id, 'badge_earned', 'User', user.id, { badgeId, pts }, req);
    res.json({ earned: true, badgeId, pointsAwarded: pts, totalPoints: user.points + pts, badges: newBadges });
  } catch (err) {
    next(err);
  }
});

router.post('/complete-challenge', [
  body('challengeId').notEmpty(),
], async (req, res, next) => {
  try {
    const { challengeId } = req.body;
    const user = await User.unscoped().findByPk(req.user.id);
    const completed = user.completedChallenges || [];

    const weekKey = `${challengeId}_${new Date().toISOString().slice(0, 7)}`;
    if (completed.includes(weekKey)) {
      return res.json({ alreadyCompleted: true, points: user.points });
    }

    const pts = CHALLENGE_POINTS[challengeId] || 30;
    await user.update({
      completedChallenges: [...completed, weekKey],
      points: (user.points || 0) + pts,
      weeklyPoints: (user.weeklyPoints || 0) + pts,
    });
    await createAuditLog(user.id, 'challenge_completed', 'User', user.id, { challengeId, pts }, req);
    res.json({ completed: true, challengeId, pointsAwarded: pts, totalPoints: user.points + pts });
  } catch (err) {
    next(err);
  }
});

router.get('/stats', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfWeek = new Date(now - (now.getDay() * 86400000)).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [monthKg, weekKg, lastMonthKg, totalLogs] = await Promise.all([
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.gte]: startOfMonth } } }),
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.gte]: startOfWeek } } }),
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.between]: [lastMonthStart, lastMonthEnd] } } }),
      EmissionEntry.count({ where: { userId } }),
    ]);

    const byCategory = await EmissionEntry.findAll({
      attributes: ['category', [fn('SUM', col('co2eKg')), 'total']],
      where: { userId, date: { [Op.gte]: startOfMonth } },
      group: ['category'],
      raw: true,
    });

    res.json({
      monthKg: monthKg || 0,
      weekKg: weekKg || 0,
      lastMonthKg: lastMonthKg || 0,
      monthChange: lastMonthKg > 0 ? Math.round((((monthKg || 0) - lastMonthKg) / lastMonthKg) * 100) : null,
      totalLogs,
      byCategory,
      streakDays: req.user.streakDays,
      longestStreak: req.user.longestStreak,
      points: req.user.points,
      weeklyPoints: req.user.weeklyPoints,
      earnedBadges: req.user.earnedBadges || [],
      completedChallenges: req.user.completedChallenges || [],
      totalOffsetKg: req.user.totalOffsetKg || 0,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/audit-log', async (req, res, next) => {
  try {
    const logs = await AuditLog.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    res.json(logs);
  } catch (err) {
    next(err);
  }
});

router.get('/messages/:friendId', async (req, res, next) => {
  try {
    const myId = req.user.id;
    const friendId = req.params.friendId;
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: myId, receiverId: friendId },
          { senderId: friendId, receiverId: myId },
        ],
      },
      order: [['createdAt', 'ASC']],
      limit: 100,
    });
    res.json(messages);
  } catch (err) {
    next(err);
  }
});

router.post('/messages/:friendId', [
  body('text').trim().notEmpty().isLength({ max: 1000 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const myId = req.user.id;
    const friendId = req.params.friendId;

    const me = await User.unscoped().findByPk(myId);
    const friendIds = (me.friends || []).map(String);
    if (!friendIds.includes(String(friendId))) {
      return res.status(403).json({ error: 'You are not friends with this user' });
    }

    const message = await Message.create({
      senderId: myId,
      receiverId: friendId,
      text: req.body.text,
    });
    res.status(201).json(message);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
