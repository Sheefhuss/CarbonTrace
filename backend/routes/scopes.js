const express = require('express');
const { body, param } = require('express-validator');
const { ScopeReport, Organization, EmissionEntry } = require('../models');
const { authenticate, requireRole } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();
router.use(authenticate, requireRole(['business_admin']));

router.get('/reports', async (req, res, next) => {
  try {
    const reports = await ScopeReport.findAll({
      where: { organizationId: req.user.organizationId },
      order: [['periodStart', 'DESC']],
    });
    res.json(reports);
  } catch (err) {
    next(err);
  }
});

router.post('/reports', [
  body('reportingPeriod').notEmpty(),
  body('periodStart').isDate(),
  body('periodEnd').isDate(),
], async (req, res, next) => {
  try {
    const { reportingPeriod, periodStart, periodEnd } = req.body;
    const orgId = req.user.organizationId;

    const { Op, fn, col, literal } = require('sequelize');
    const scopeAgg = await EmissionEntry.findAll({
      attributes: ['scope', [fn('SUM', col('co2eKg')), 'total'], 'subCategory'],
      where: {
        userId: { [Op.in]: literal(`(SELECT id FROM users WHERE organization_id = '${orgId}')`) },
        date: { [Op.between]: [periodStart, periodEnd] },
        scope: { [Op.not]: null },
      },
      group: ['scope', 'subCategory'],
      raw: true,
    });

    const scopeTotals = { scope1: 0, scope2: 0, scope3: 0 };
    const breakdowns = { scope1Breakdown: {}, scope2Breakdown: {}, scope3Breakdown: {} };

    scopeAgg.forEach(({ scope, total, subCategory }) => {
      if (!scope) return;
      scopeTotals[scope] = (scopeTotals[scope] || 0) + parseFloat(total);
      const bKey = `${scope}Breakdown`;
      breakdowns[bKey][subCategory || 'other'] = (breakdowns[bKey][subCategory || 'other'] || 0) + parseFloat(total);
    });

    const report = await ScopeReport.create({
      organizationId: orgId,
      reportingPeriod,
      periodStart,
      periodEnd,
      scope1Emissions: scopeTotals.scope1,
      scope2Emissions: scopeTotals.scope2,
      scope3Emissions: scopeTotals.scope3,
      scope1: scopeTotals.scope1,
      scope2: scopeTotals.scope2,
      scope3: scopeTotals.scope3,
      totalEmissions: scopeTotals.scope1 + scopeTotals.scope2 + scopeTotals.scope3,
      ...breakdowns,
      status: 'draft',
    });

    await createAuditLog(req.user.id, 'report_created', 'ScopeReport', report.id, {}, req);
    res.status(201).json(report);
  } catch (err) {
    next(err);
  }
});

router.put('/reports/:id/submit', [param('id').isUUID()], async (req, res, next) => {
  try {
    const report = await ScopeReport.findOne({
      where: { id: req.params.id, organizationId: req.user.organizationId },
    });
    if (!report) throw new AppError('Report not found', 404);
    if (report.status !== 'draft') throw new AppError('Only draft reports can be submitted', 400);

    await report.update({ status: 'submitted', submittedAt: new Date() });
    await createAuditLog(req.user.id, 'report_submitted', 'ScopeReport', report.id, {}, req);
    res.json(report);
  } catch (err) {
    next(err);
  }
});

router.get('/reports/:id/export', [param('id').isUUID()], async (req, res, next) => {
  try {
    const report = await ScopeReport.findOne({
      where: { id: req.params.id, organizationId: req.user.organizationId },
      include: [{ association: 'organization' }],
    });
    if (!report) throw new AppError('Report not found', 404);

    const s1 = report.scope1Emissions || report.scope1 || 0;
    const s2 = report.scope2Emissions || report.scope2 || 0;
    const s3 = report.scope3Emissions || report.scope3 || 0;

    const exportData = {
      meta: {
        generatedAt: new Date().toISOString(),
        organization: report.organization?.name,
        period: report.reportingPeriod,
        standard: 'GHG Protocol',
      },
      totals: {
        scope1: s1,
        scope2: s2,
        scope3: s3,
        grandTotal: s1 + s2 + s3,
      },
      breakdowns: {
        scope1: report.scope1Breakdown,
        scope2: report.scope2Breakdown,
        scope3: report.scope3Breakdown,
      },
      status: report.status,
      verifiedAt: report.verifiedAt,
    };

    await createAuditLog(req.user.id, 'report_exported', 'ScopeReport', report.id, {}, req);
    res.json(exportData);
  } catch (err) {
    next(err);
  }
});

module.exports = router;