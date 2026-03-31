const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { body, validationResult } = require('express-validator');
const { User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');
const { createAuditLog } = require('../utils/audit');

const router = express.Router();

const generateToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

const generateFriendCode = () =>
  crypto.randomBytes(4).toString('hex').toUpperCase();

const generateUsername = (name) => {
  const base = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 12) || 'user';
  const suffix = Math.floor(Math.random() * 9000) + 1000;
  return `${base}${suffix}`;
};

const PUBLIC_FIELDS = [
  'id', 'name', 'username', 'avatarIndex', 'role', 'country', 'region',
  'streakDays', 'longestStreak', 'points', 'weeklyPoints', 'totalOffsetKg',
  'baselineFootprint', 'earnedBadges', 'completedChallenges',
  'weeklyGoalKg', 'friendCode', 'friends',
  'emailNotifications', 'weeklyEmailEnabled', 'isVerified',
  'organizationId', 'lastActiveDate', 'createdAt',
];

const pickUser = (user) =>
  PUBLIC_FIELDS.reduce((acc, k) => {
    if (user[k] !== undefined) acc[k] = user[k];
    return acc;
  }, {});

const createTransporter = () => {
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

const checkSmtp = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP not configured. Add SMTP_HOST, SMTP_USER, SMTP_PASS to your environment variables.');
  }
};

const sendVerificationEmail = async (email, token, userName) => {
  checkSmtp();
  const transporter = createTransporter();
  const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verify-email?token=${token}`;
  const firstName = userName?.split(' ')[0] || 'there';

  await transporter.sendMail({
    from: `"CarbonTrace" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verify your CarbonTrace email 🌿',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f9f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
    <div style="background:#0e221b;padding:28px 32px;text-align:center">
      <span style="font-size:24px">🌿</span>
      <span style="color:#fff;font-size:20px;font-weight:700;margin-left:8px">CarbonTrace</span>
    </div>
    <div style="padding:32px">
      <p style="color:#1b3d2f;font-size:16px;margin:0 0 16px">Hi ${firstName} 👋</p>
      <p style="color:#2e5c46;font-size:14px;line-height:1.6;margin:0 0 24px">
        Welcome to CarbonTrace! Please verify your email address to activate your account.
        This link expires in <strong>24 hours</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${verifyUrl}"
          style="display:inline-block;background:#40926d;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
          Verify My Email
        </a>
      </div>
      <p style="color:#64b18c;font-size:12px;text-align:center;margin:0 0 16px">
        Or copy this link:<br/>
        <span style="color:#40926d;word-break:break-all">${verifyUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #e1f2e7;margin:24px 0"/>
      <p style="color:#97ceb1;font-size:12px;margin:0">
        If you didn't create a CarbonTrace account, you can safely ignore this email.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
};

const sendResetEmail = async (email, resetToken, userName) => {
  checkSmtp();
  const transporter = createTransporter();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
  const firstName = userName?.split(' ')[0] || 'there';

  await transporter.sendMail({
    from: `"CarbonTrace" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
    to: email,
    subject: 'Reset your CarbonTrace password 🌿',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f9f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">
    <div style="background:#0e221b;padding:28px 32px;text-align:center">
      <span style="font-size:24px">🌿</span>
      <span style="color:#fff;font-size:20px;font-weight:700;margin-left:8px">CarbonTrace</span>
    </div>
    <div style="padding:32px">
      <p style="color:#1b3d2f;font-size:16px;margin:0 0 16px">Hi ${firstName} 👋</p>
      <p style="color:#2e5c46;font-size:14px;line-height:1.6;margin:0 0 24px">
        We received a request to reset your CarbonTrace password. Click the button below to choose a new one.
        This link expires in <strong>1 hour</strong>.
      </p>
      <div style="text-align:center;margin:28px 0">
        <a href="${resetUrl}"
          style="display:inline-block;background:#40926d;color:#fff;text-decoration:none;padding:14px 32px;border-radius:10px;font-weight:700;font-size:15px">
          Reset My Password
        </a>
      </div>
      <p style="color:#64b18c;font-size:12px;text-align:center;margin:0 0 16px">
        Or copy this link:<br/>
        <span style="color:#40926d;word-break:break-all">${resetUrl}</span>
      </p>
      <hr style="border:none;border-top:1px solid #e1f2e7;margin:24px 0"/>
      <p style="color:#97ceb1;font-size:12px;margin:0">
        If you didn't request this, you can safely ignore this email. Your password won't change.
      </p>
    </div>
  </div>
</body>
</html>`,
  });
};

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['individual']),
  body('username').optional({ checkFalsy: true }).trim().isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username can only have letters, numbers, underscores'),
  body('avatarIndex').optional().isInt({ min: 0, max: 14 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password, name, country = 'IND', avatarIndex = 0 } = req.body;
    const role = 'individual';

    const exists = await User.unscoped().findOne({ where: { email } });
    if (exists) throw new AppError('Email already registered', 409);

    let username = req.body.username?.trim();
    if (username) {
      const usernameExists = await User.unscoped().findOne({ where: { username } });
      if (usernameExists) throw new AppError('That username is already taken. Please choose another.', 409);
    } else {
      username = generateUsername(name);
      let usernameExists = await User.unscoped().findOne({ where: { username } });
      while (usernameExists) {
        username = generateUsername(name);
        usernameExists = await User.unscoped().findOne({ where: { username } });
      }
    }

    let friendCode = generateFriendCode();
    let codeExists = await User.unscoped().findOne({ where: { friendCode } });
    while (codeExists) {
      friendCode = generateFriendCode();
      codeExists = await User.unscoped().findOne({ where: { friendCode } });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const today = new Date().toISOString().split('T')[0];
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.unscoped().create({
      email, passwordHash, name, username, avatarIndex,
      role, country, friendCode,
      lastActiveDate: today,
      streakDays: 1,
      longestStreak: 1,
      points: 10,
      weeklyPoints: 10,
      verificationToken,
      verificationExpires,
      isVerified: false,
    });

    sendVerificationEmail(user.email, verificationToken, user.name).catch(err =>
      require('../utils/logger').warn('Verification email failed:', err.message)
    );

    const token = generateToken(user.id);
    await createAuditLog(user.id, 'register', 'User', user.id, { role, username }, req);

    res.status(201).json({ token, user: pickUser(user) });
  } catch (err) {
    next(err);
  }
});

router.get('/verify-email', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) throw new AppError('Missing verification token', 400);

    const user = await User.unscoped().findOne({
      where: {
        verificationToken: token,
        verificationExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) throw new AppError('Verification link is invalid or has expired. Please register again or request a new link.', 400);

    await user.update({
      isVerified: true,
      verificationToken: null,
      verificationExpires: null,
    });

    await createAuditLog(user.id, 'email_verified', 'User', user.id, {}, req);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?verified=true`);
  } catch (err) {
    next(err);
  }
});

router.post('/resend-verification', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    res.json({ message: 'If that email is registered and unverified, a new verification link has been sent.' });

    const user = await User.scope('withEmail').findOne({ where: { email: req.body.email } });
    if (!user || user.isVerified) return;

    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await user.update({ verificationToken, verificationExpires });

    sendVerificationEmail(user.email, verificationToken, user.name).catch(err =>
      require('../utils/logger').warn('Resend verification email failed:', err.message)
    );
  } catch (err) {
    next(err);
  }
});

router.post('/login', [
  body('identifier').notEmpty().withMessage('Email or username is required'),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { identifier, password } = req.body;

    const isEmail = identifier.includes('@');
    const where = isEmail
      ? { email: identifier.toLowerCase().trim() }
      : { username: identifier.trim() };

    const user = await User.unscoped().findOne({ where });
    if (!user) throw new AppError('Invalid credentials', 401);

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new AppError('Invalid credentials', 401);

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let streakDays = 1;
    if (user.lastActiveDate === today) {
      streakDays = user.streakDays;
    } else if (user.lastActiveDate === yesterday) {
      streakDays = (user.streakDays || 0) + 1;
    }

    const longestStreak = Math.max(streakDays, user.longestStreak || 0);
    const isNewDay = user.lastActiveDate !== today;
    const loginPoints = isNewDay ? 5 : 0;

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const shouldResetWeekly = !user.lastWeeklyReset || user.lastWeeklyReset < weekStartStr;

    const updateData = {
      lastActiveDate: today,
      streakDays,
      longestStreak,
      points: (user.points || 0) + loginPoints,
      weeklyPoints: shouldResetWeekly ? loginPoints : (user.weeklyPoints || 0) + loginPoints,
    };
    if (shouldResetWeekly) updateData.lastWeeklyReset = weekStartStr;

    await user.update(updateData);

    const token = generateToken(user.id);
    await createAuditLog(user.id, 'login', 'User', user.id, {}, req);

    const fresh = await User.unscoped().findByPk(user.id);
    res.json({ token, user: pickUser(fresh) });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res) => {
  const user = await User.unscoped().findByPk(req.user.id);
  res.json({ user: pickUser(user) });
});

router.post('/logout', authenticate, async (req, res, next) => {
  try {
    await createAuditLog(req.user.id, 'logout', 'User', req.user.id, {}, req);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    next(err);
  }
});

router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    res.json({ message: 'If that email is registered, you will receive a reset link shortly.' });

    const user = await User.scope('withEmail').findOne({ where: { email: req.body.email } });
    if (!user) return;

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000);

    await user.update({ resetPasswordToken: resetToken, resetPasswordExpires: resetExpires });

    sendResetEmail(user.email, resetToken, user.name).catch(err =>
      console.error('Failed to send reset email:', err.message)
    );

    await createAuditLog(user.id, 'password_reset_requested', 'User', user.id, { email: req.body.email }, req);
  } catch (err) {
    next(err);
  }
});

router.post('/reset-password', [
  body('token').notEmpty(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { token, password } = req.body;

    const user = await User.scope('withEmail').findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() },
      },
    });

    if (!user) throw new AppError('Reset link is invalid or has expired. Please request a new one.', 400);

    const passwordHash = await bcrypt.hash(password, 12);

    await user.update({
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null,
    });

    await createAuditLog(user.id, 'password_reset_completed', 'User', user.id, {}, req);

    res.json({ message: 'Password reset successfully. You can now sign in.' });
  } catch (err) {
    next(err);
  }
});

router.put('/profile', authenticate, [
  body('avatarIndex').optional().isInt({ min: 0, max: 14 }),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = await User.unscoped().findByPk(req.user.id);
    if (!user) throw new AppError('User not found', 404);

    if (req.body.avatarIndex !== undefined) {
      user.avatarIndex = req.body.avatarIndex;
    }

    await user.save();
    res.json({ message: 'Profile updated successfully', user: pickUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
