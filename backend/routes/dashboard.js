const express = require('express');
const { Op, fn, col, literal, QueryTypes } = require('sequelize');
const { EmissionEntry, User, sequelize } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

const COUNTRY_AVG = {
  IND: 150, USA: 1500, GBR: 750, DEU: 870,
  FRA: 600, AUS: 1400, CAN: 1380, BRA: 220,
  CHN: 580, WORLD: 400,
};
const PARIS_MONTHLY = 208;

router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const startOfYear = `${now.getFullYear()}-01-01`;
    const startOf30 = new Date(now - 30 * 86400000).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];

    const [monthTotal, yearTotal, lastMonthTotal] = await Promise.all([
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.gte]: startOfMonth } } }),
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.gte]: startOfYear } } }),
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.between]: [lastMonthStart, lastMonthEnd] } } }),
    ]);

    const byCategory = await EmissionEntry.findAll({
      attributes: ['category', [fn('SUM', col('co2eKg')), 'total']],
      where: { userId, date: { [Op.gte]: startOf30 } },
      group: ['category'],
      raw: true,
    });

    const dailyTrend = await sequelize.query(`
      SELECT date, SUM(co2e_kg) as total
      FROM emission_entries
      WHERE user_id = :userId AND date >= :startDate AND deleted_at IS NULL
      GROUP BY date ORDER BY date ASC
    `, { replacements: { userId, startDate: startOf30 }, type: QueryTypes.SELECT });

    const monthlyTrend = await sequelize.query(`
      SELECT TO_CHAR(date, 'YYYY-MM') as month, SUM(co2e_kg) as total
      FROM emission_entries
      WHERE user_id = :userId AND date >= (CURRENT_DATE - INTERVAL '12 months') AND deleted_at IS NULL
      GROUP BY month ORDER BY month ASC
    `, { replacements: { userId }, type: QueryTypes.SELECT });

    const country = req.user.country || 'WORLD';
    const countryAvg = COUNTRY_AVG[country] || COUNTRY_AVG.WORLD;
    const monthKg = monthTotal || 0;
    const projectedAnnual = monthKg > 0 ? monthKg * 12 : null;
    const monthChange = lastMonthTotal > 0
      ? Math.round(((monthKg - lastMonthTotal) / lastMonthTotal) * 100)
      : null;

    res.json({
      monthTotal: monthKg,
      yearTotal: yearTotal || 0,
      lastMonthTotal: lastMonthTotal || 0,
      monthChange,
      projectedAnnual,
      byCategory,
      dailyTrend,
      monthlyTrend,
      benchmarks: {
        parisTargetMonthly: PARIS_MONTHLY,
        countryAvgMonthly: countryAvg,
        worldAvgMonthly: COUNTRY_AVG.WORLD,
        vsCountry: monthKg > 0 ? Math.round(((monthKg - countryAvg) / countryAvg) * 100) : null,
        vsWorld: monthKg > 0 ? Math.round(((monthKg - COUNTRY_AVG.WORLD) / COUNTRY_AVG.WORLD) * 100) : null,
        isParisSafe: projectedAnnual !== null ? projectedAnnual <= 2500 : null,
      },
      gamification: {
        streak: req.user.streakDays || 0,
        longestStreak: req.user.longestStreak || 0,
        points: req.user.points || 0,
        weeklyPoints: req.user.weeklyPoints || 0,
        totalOffsetKg: req.user.totalOffsetKg || 0,
        earnedBadges: req.user.earnedBadges || [],
        weeklyGoalKg: req.user.weeklyGoalKg || null,
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/leaderboard', async (req, res, next) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    const thirtyDaysAgo = new Date(now - 30 * 86400000).toISOString().split('T')[0];

    const users = await User.unscoped().findAll({
      where: { role: 'individual' },
      attributes: ['id', 'name', 'username', 'avatarIndex', 'country', 'points', 'weeklyPoints',
        'streakDays', 'longestStreak', 'totalOffsetKg', 'earnedBadges', 'lastActiveDate', 'createdAt'],
    });

    const thirtyDayCounts = await EmissionEntry.findAll({
      attributes: ['userId', [fn('COUNT', col('id')), 'count']],
      where: { date: { [Op.gte]: thirtyDaysAgo } },
      group: ['userId'],
      raw: true,
    });
    const activityMap = {};
    thirtyDayCounts.forEach(r => { activityMap[r.userId] = parseInt(r.count); });

    const monthTotals = await EmissionEntry.findAll({
      attributes: ['userId', [fn('SUM', col('co2eKg')), 'total']],
      where: { date: { [Op.gte]: startOfMonth } },
      group: ['userId'],
      raw: true,
    });
    const monthMap = {};
    monthTotals.forEach(r => { monthMap[r.userId] = parseFloat(r.total); });

    const lastMonthTotals = await EmissionEntry.findAll({
      attributes: ['userId', [fn('SUM', col('co2eKg')), 'total']],
      where: { date: { [Op.between]: [lastMonthStart, lastMonthEnd] } },
      group: ['userId'],
      raw: true,
    });
    const lastMonthMap = {};
    lastMonthTotals.forEach(r => { lastMonthMap[r.userId] = parseFloat(r.total); });

    const scored = users.map(u => {
      const activityCount = activityMap[u.id] || 0;
      const monthKg = monthMap[u.id] || 0;
      const lastMonthKg = lastMonthMap[u.id] || 0;
      const countryAvg = COUNTRY_AVG[u.country] || COUNTRY_AVG.WORLD;

      const activityScore = Math.min(activityCount * 3, 60);
      const streakScore = Math.min((u.streakDays || 0) * 2, 40);
      const badgeScore = Math.min((u.earnedBadges?.length || 0) * 5, 30);
      const offsetScore = Math.min((u.totalOffsetKg || 0) / 10, 20);

      let reductionScore = 0;
      if (monthKg > 0 && lastMonthKg > 0) {
        const reduction = ((lastMonthKg - monthKg) / lastMonthKg) * 100;
        reductionScore = Math.max(0, Math.min(reduction, 30));
      }

      let efficiencyScore = 0;
      if (monthKg > 0) {
        const belowAvg = ((countryAvg - monthKg) / countryAvg) * 100;
        efficiencyScore = Math.max(0, Math.min(belowAvg, 20));
      }

      const isActive = activityCount >= 3;
      const score = isActive
        ? Math.round(activityScore + streakScore + badgeScore + offsetScore + reductionScore + efficiencyScore)
        : Math.round((activityScore + streakScore) * 0.3);

      return {
        id: u.id,
        name: u.name,
        username: u.username,
        avatarIndex: u.avatarIndex ?? 0,
        country: u.country,
        points: u.points || 0,
        weeklyPoints: u.weeklyPoints || 0,
        streakDays: u.streakDays || 0,
        totalOffsetKg: u.totalOffsetKg || 0,
        earnedBadges: u.earnedBadges || [],
        activityCount,
        monthKg,
        score,
        isYou: u.id === req.user.id,
      };
    });

    scored.sort((a, b) => b.score - a.score || b.points - a.points);
    const ranked = scored.map((u, i) => ({ ...u, rank: i + 1 }));
    const yourRank = ranked.find(u => u.isYou)?.rank || null;

    res.json({ leaderboard: ranked.slice(0, 20), yourRank });
  } catch (err) {
    next(err);
  }
});

router.get('/weekly-report', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const now = new Date();
    const startOfWeek = new Date(now - (now.getDay() * 86400000)).toISOString().split('T')[0];
    const startOfLastWeek = new Date(now - ((now.getDay() + 7) * 86400000)).toISOString().split('T')[0];
    const endOfLastWeek = new Date(now - ((now.getDay() + 1) * 86400000)).toISOString().split('T')[0];

    const [thisWeek, lastWeek] = await Promise.all([
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.gte]: startOfWeek } } }),
      EmissionEntry.sum('co2eKg', { where: { userId, date: { [Op.between]: [startOfLastWeek, endOfLastWeek] } } }),
    ]);

    const dailyBreakdown = await EmissionEntry.findAll({
      attributes: ['date', 'category', [fn('SUM', col('co2eKg')), 'total']],
      where: { userId, date: { [Op.gte]: startOfWeek } },
      group: ['date', 'category'],
      order: [['date', 'ASC']],
      raw: true,
    });

    res.json({
      thisWeekKg: thisWeek || 0,
      lastWeekKg: lastWeek || 0,
      weeklyChange: lastWeek > 0 ? Math.round((((thisWeek || 0) - lastWeek) / lastWeek) * 100) : null,
      dailyBreakdown,
      weeklyGoalKg: req.user.weeklyGoalKg || null,
      onTrackForGoal: req.user.weeklyGoalKg ? (thisWeek || 0) <= req.user.weeklyGoalKg : null,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/tips', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const startOf30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    const topCategories = await EmissionEntry.findAll({
      attributes: ['category', [fn('SUM', col('co2eKg')), 'total']],
      where: { userId, date: { [Op.gte]: startOf30 } },
      group: ['category'],
      order: [[literal('total'), 'DESC']],
      limit: 3,
      raw: true,
    });
    const lib = {
      transport: [
        { tip: 'Use public transport once a week', savingKgPerYear: 200, difficulty: 'easy', icon: '🚌' },
        { tip: 'Switch to EV or CNG', savingKgPerYear: 1200, difficulty: 'hard', icon: '⚡' },
        { tip: 'Train over flight for under 500km', savingKgPerYear: 400, difficulty: 'medium', icon: '🚆' },
      ],
      food: [
        { tip: 'Go meat-free one day/week', savingKgPerYear: 182, difficulty: 'easy', icon: '🥗' },
        { tip: 'Switch from beef to chicken', savingKgPerYear: 400, difficulty: 'medium', icon: '🍗' },
        { tip: 'Buy local seasonal vegetables', savingKgPerYear: 120, difficulty: 'easy', icon: '🥦' },
      ],
      shopping: [
        { tip: 'Buy second-hand clothing', savingKgPerYear: 180, difficulty: 'easy', icon: '👕' },
        { tip: 'Repair instead of replace', savingKgPerYear: 200, difficulty: 'medium', icon: '🔧' },
      ],
      housing: [
        { tip: 'Switch to LED bulbs', savingKgPerYear: 63, difficulty: 'easy', icon: '💡' },
        { tip: 'Install solar panels', savingKgPerYear: 1500, difficulty: 'hard', icon: '☀️' },
      ],
    };
    res.json({ tips: topCategories.flatMap(({ category }) => lib[category] || []), topCategories });
  } catch (err) {
    next(err);
  }
});

module.exports = router;