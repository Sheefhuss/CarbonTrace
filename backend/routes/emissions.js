const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { EmissionEntry, Activity, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const calculator = require('../services/emissionCalculator');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

const FALLBACK_FACTORS = {
  'Personal Car (Gasoline)': 0.192,
  'Personal Car (EV)': 0.053,
  'Bus / Public Transit': 0.105,
  'Flight (Domestic)': 0.255,
  'Bicycle / Walk': 0,
  'Heavy Meat (Mutton)': 7.2,
  'White Meat (Chicken / Fish / Seafood)': 1.5,
  'Vegetarian (Dairy-Heavy / Paneer / Ghee)': 2.0,
  'Vegetarian (Standard Dal / Rice / Sabzi)': 1.2,
  'Fast Food / Street Food (Mixed)': 1.0,
  'Vegan (Strictly Plant-Based)': 0.8,
  'Clothing / Fast Fashion': 0.5,
  'Electronics': 1.2,
  'Furniture': 0.8,
};

const POINTS_PER_ENTRY = 2;
const POINTS_LOW_CARBON = 5;
const LOW_CARBON_THRESHOLD = 2;

router.get('/', [
  query('startDate').optional().isDate(),
  query('endDate').optional().isDate(),
  query('category').optional().isIn(['housing', 'transport', 'food', 'shopping', 'industrial', 'other']),
  query('limit').optional().isInt({ min: 1, max: 500 }),
], async (req, res, next) => {
  try {
    const { startDate, endDate, category, limit = 200, offset = 0 } = req.query;
    const where = { userId: req.user.id };
    if (category) where.category = category;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const { count, rows } = await EmissionEntry.findAndCountAll({
      where,
      include: [{ association: 'activity', attributes: ['name', 'icon', 'unit'], required: false }],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ total: count, data: rows });
  } catch (err) {
    next(err);
  }
});

router.post('/', [
  body('category').isIn(['housing', 'transport', 'food', 'shopping', 'industrial', 'other']),
  body('quantity').isFloat({ min: 0 }),
  body('unit').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { activitySlug, activityId, category, subCategory, quantity, unit, date, notes, scope } = req.body;

    let activityModel = null;
    if (activityId) {
      activityModel = await Activity.findByPk(activityId);
    } else if (activitySlug) {
      activityModel = await Activity.findOne({ where: { slug: activitySlug } });
    }

    let co2eKg = 0;
    let emissionFactor = 0;

    try {
      const calcResult = await calculator.calculate({
        activitySlug: activitySlug || subCategory,
        quantity: parseFloat(quantity),
        unit,
        country: req.user.country || 'IND',
        activityModel,
      });
      co2eKg = calcResult.co2eKg;
      emissionFactor = calcResult.emissionFactor;
    } catch {
      emissionFactor = FALLBACK_FACTORS[subCategory] || 0.5;
      co2eKg = parseFloat(quantity) * emissionFactor;
    }

    const entry = await EmissionEntry.create({
      userId: req.user.id,
      activityId: activityModel?.id || null,
      category,
      subCategory,
      scope: scope || null,
      quantity: parseFloat(quantity),
      unit,
      emissionFactor,
      co2eKg,
      date: date || new Date().toISOString().split('T')[0],
      notes,
    });

    let pointsEarned = POINTS_PER_ENTRY;
    let bonusReason = null;

    if (co2eKg <= LOW_CARBON_THRESHOLD) {
      pointsEarned += POINTS_LOW_CARBON;
      bonusReason = 'low_carbon_bonus';
    }

    await req.user.update({ points: (req.user.points || 0) + pointsEarned });
    await createAuditLog(req.user.id, 'emission_created', 'EmissionEntry', entry.id, { co2eKg, pointsEarned }, req);

    res.status(201).json({ entry, pointsEarned, bonusReason });
  } catch (err) {
    next(err);
  }
});

router.post('/estimate', async (req, res, next) => {
  try {
    const baseline = calculator.estimateBaseline({ ...req.body, country: req.user.country || 'IND' });
    await req.user.update({ baselineFootprint: baseline.totalKgPerYear });
    await createAuditLog(req.user.id, 'quiz_completed', 'User', req.user.id, { baseline: baseline.totalKgPerYear }, req);
    res.json(baseline);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', [param('id').isUUID()], async (req, res, next) => {
  try {
    const entry = await EmissionEntry.findOne({
      where: { id: req.params.id, userId: req.user.id },
    });
    if (!entry) throw new AppError('Entry not found', 404);

    await entry.destroy();
    await createAuditLog(req.user.id, 'emission_deleted', 'EmissionEntry', req.params.id, {}, req);
    res.json({ message: 'Entry deleted' });
  } catch (err) {
    next(err);
  }
});

router.get('/monthly-summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        label: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0],
        end: new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0],
      });
    }

    const results = await Promise.all(
      months.map(async (m) => {
        const total = await EmissionEntry.sum('co2eKg', {
          where: { userId, date: { [Op.between]: [m.start, m.end] } },
        });
        return { month: m.label, kg: total || 0 };
      })
    );

    res.json(results);
  } catch (err) {
    next(err);
  }
});

module.exports = router;