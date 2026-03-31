require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { sequelize } = require('./models');
const logger = require('./utils/logger');

const authRoutes = require('./routes/auth_backend.js');
const userRoutes = require('./routes/users');
const emissionRoutes = require('./routes/emissions');
const activityRoutes = require('./routes/activities');
const dashboardRoutes = require('./routes/dashboard');
const creditsRoutes = require('./routes/credits');
const scopeRoutes = require('./routes/scopes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 200,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' },
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', { stream: { write: msg => logger.info(msg.trim()) } }));
}

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
    version: '2.0.0',
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/emissions', emissionRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/scopes', scopeRoutes);

app.post('/api/cron/weekly-email', async (req, res, next) => {
  try {
    const secret = process.env.CRON_SECRET;
    if (!secret || req.headers['x-cron-secret'] !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { sendWeeklyEmails } = require('./utils/weeklyEmail');
    await sendWeeklyEmails();
    res.json({ ok: true, timestamp: new Date().toISOString() });
  } catch (err) {
    next(err);
  }
});

app.get('/admin/list-users', async (req, res) => {
  const { User } = require('./models');
  const users = await User.unscoped().findAll({
    attributes: ['id', 'name', 'email', 'username', 'points'],
  });
  res.json(users);
});

app.get('/admin/delete-user/:username', async (req, res) => {
  const { User, EmissionEntry, AuditLog } = require('./models');
  const user = await User.unscoped().findOne({ where: { username: req.params.username } });
  if (!user) return res.json({ error: 'Not found' });
  await EmissionEntry.destroy({ where: { userId: user.id }, force: true });
  await AuditLog.destroy({ where: { userId: user.id }, force: true }).catch(() => {});
  await user.destroy({ force: true });
  res.json({ deleted: user.username });
});

app.use('*', (req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully.');

    await sequelize.sync({ alter: true });
    logger.info('Database synced.');

    const requiredEnv = ['JWT_SECRET', 'SMTP_HOST', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM', 'FRONTEND_URL'];
    const missing = requiredEnv.filter(k => !process.env[k]);
    if (missing.length) {
      logger.warn(`Missing env vars: ${missing.join(', ')} — email features may not work`);
    }

    app.listen(PORT, () => {
      logger.info(`CarbonTrace server running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Unable to connect to database:', err);
    process.exit(1);
  }
};

startServer();

module.exports = app;
