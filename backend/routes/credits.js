const express = require('express');
const { body, param } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const { CarbonCredit, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

// Simulated marketplace listings (in production: fetch from Verra / Gold Standard API)
const MARKETPLACE_LISTINGS = [
  {
    id: 'listing-001',
    projectName: 'Amazon Reforestation Brazil',
    projectType: 'reforestation',
    verificationBody: 'verra',
    country: 'BRA',
    pricePerTon: 12.50,
    currency: 'USD',
    availableTons: 5000,
    description: 'Protects 12,000 hectares of primary forest in Pará state.',
    co2eCapturedTons: 45000,
    vintageYear: 2023,
    sdgGoals: [13, 15, 1],
    imageUrl: '/assets/projects/amazon.jpg',
  },
  {
    id: 'listing-002',
    projectName: 'Wind Farm Rajasthan India',
    projectType: 'renewable_energy',
    verificationBody: 'gold_standard',
    country: 'IND',
    pricePerTon: 8.00,
    currency: 'USD',
    availableTons: 10000,
    description: '50MW wind farm displacing coal power in Rajasthan.',
    co2eCapturedTons: 85000,
    vintageYear: 2023,
    sdgGoals: [7, 13],
    imageUrl: '/assets/projects/wind.jpg',
  },
  {
    id: 'listing-003',
    projectName: 'Blue Carbon Mangroves Indonesia',
    projectType: 'ocean',
    verificationBody: 'verra',
    country: 'IDN',
    pricePerTon: 18.00,
    currency: 'USD',
    availableTons: 2000,
    description: 'Restoring coastal mangroves in Sumatra, high biodiversity co-benefits.',
    co2eCapturedTons: 15000,
    vintageYear: 2024,
    sdgGoals: [14, 13, 15],
    imageUrl: '/assets/projects/mangrove.jpg',
  },
];

// ─── GET /api/credits/marketplace ─────────────────────────────────────────────
router.get('/marketplace', (req, res) => {
  res.json(MARKETPLACE_LISTINGS);
});

// ─── POST /api/credits/purchase ───────────────────────────────────────────────
router.post('/purchase', [
  body('listingId').notEmpty(),
  body('quantityTons').isFloat({ min: 0.1 }),
], async (req, res, next) => {
  try {
    const { listingId, quantityTons } = req.body;

    const listing = MARKETPLACE_LISTINGS.find(l => l.id === listingId);
    if (!listing) throw new AppError('Listing not found', 404);
    if (quantityTons > listing.availableTons) {
      throw new AppError(`Only ${listing.availableTons} tons available`, 400);
    }

    const totalPriceUsd = parseFloat(quantityTons) * listing.pricePerTon;

    const credit = await CarbonCredit.create({
      userId: req.user.id,
      projectName: listing.projectName,
      projectType: listing.projectType,
      verificationBody: listing.verificationBody,
      serialNumber: `CT-${Date.now()}-${uuidv4().split('-')[0].toUpperCase()}`,
      quantityTons: parseFloat(quantityTons),
      pricePerTon: listing.pricePerTon,
      totalPriceUsd,
      currency: listing.currency,
      status: 'active',
    });

    // Award points
    const points = Math.round(quantityTons * 10);
    await req.user.update({
      points: req.user.points + points,
      totalOffsetKg: req.user.totalOffsetKg + (quantityTons * 1000),
    });

    await createAuditLog(req.user.id, 'credit_purchased', 'CarbonCredit', credit.id, { quantityTons, totalPriceUsd }, req);

    res.status(201).json({ credit, pointsEarned: points });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/credits/:id/retire ─────────────────────────────────────────────
router.post('/:id/retire', [param('id').isUUID()], async (req, res, next) => {
  try {
    const credit = await CarbonCredit.findOne({ where: { id: req.params.id, userId: req.user.id } });
    if (!credit) throw new AppError('Credit not found', 404);
    if (credit.status === 'retired') throw new AppError('Credit already retired', 400);

    await credit.update({ status: 'retired', retiredAt: new Date() });
    await createAuditLog(req.user.id, 'credit_retired', 'CarbonCredit', credit.id, {}, req);

    res.json({ message: 'Credit retired successfully', credit });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/credits/mine ────────────────────────────────────────────────────
router.get('/mine', async (req, res, next) => {
  try {
    const credits = await CarbonCredit.findAll({
      where: { userId: req.user.id },
      order: [['purchasedAt', 'DESC']],
    });
    res.json(credits);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
