const express = require('express');
const { Activity } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { category } = req.query;
    const where = { isActive: true };
    if (category) where.category = category;

    const activities = await Activity.findAll({
      where,
      order: [['category', 'ASC'], ['name', 'ASC']],
    });
    res.json(activities);
  } catch (err) {
    next(err);
  }
});

module.exports = router;