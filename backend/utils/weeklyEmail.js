// FILE: backend/utils/weeklyEmail.js
// FIX: Renamed from Weeklyemail.js → weeklyEmail.js (Linux is case-sensitive)

const { Op, fn, col } = require('sequelize');
const { User, EmissionEntry } = require('../models');
const logger = require('./logger');

const COUNTRY_AVG = {
  IND: 150, USA: 1500, GBR: 750, DEU: 870,
  FRA: 600, AUS: 1400, CAN: 1380, BRA: 220,
  CHN: 580, WORLD: 400,
};

const formatKg = (kg) => {
  if (!kg || kg === 0) return '0 kg';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t`;
  return `${Math.round(kg)} kg`;
};

const buildEmailHtml = (user, stats) => {
  const { thisWeekKg, lastWeekKg, topCategory, streak, points } = stats;
  const change = lastWeekKg > 0 ? Math.round(((thisWeekKg - lastWeekKg) / lastWeekKg) * 100) : null;
  const countryAvg = COUNTRY_AVG[user.country] || COUNTRY_AVG.WORLD;
  const vsCountry = thisWeekKg > 0 ? Math.round(((thisWeekKg - countryAvg) / countryAvg) * 100) : null;

  const trendText = change === null ? '' :
    change < 0 ? `📉 ${Math.abs(change)}% less than last week — great progress!` :
    change === 0 ? `Same as last week. Keep going!` :
    `📈 ${change}% more than last week. Let's try to bring it down.`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f2f9f5;font-family:'Helvetica Neue',Arial,sans-serif">
  <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)">

    <div style="background:#0e221b;padding:28px 32px;text-align:center">
      <div style="display:inline-flex;align-items:center;gap:8px">
        <span style="font-size:24px">🌿</span>
        <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px">CarbonTrace</span>
      </div>
      <p style="color:#97ceb1;font-size:13px;margin:6px 0 0">Your weekly footprint summary</p>
    </div>

    <div style="padding:28px 32px">
      <p style="color:#1b3d2f;font-size:16px;margin:0 0 20px">Hi ${user.name?.split(' ')[0]} 👋</p>

      <div style="background:#f2f9f5;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
        <p style="color:#64b18c;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px">This week's footprint</p>
        <p style="color:#0e221b;font-size:36px;font-weight:700;margin:0;line-height:1">${formatKg(thisWeekKg)} CO₂e</p>
        ${trendText ? `<p style="color:#2e7556;font-size:13px;margin:8px 0 0">${trendText}</p>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:20px">
        ${[
          { label: 'Streak', value: `${streak} days 🔥` },
          { label: 'Points', value: `${points} pts ⭐` },
          { label: 'Top source', value: topCategory || 'None yet' },
        ].map(s => `
          <div style="background:#f9fcfa;border:1px solid #e1f2e7;border-radius:10px;padding:12px;text-align:center">
            <p style="color:#97ceb1;font-size:11px;font-weight:700;text-transform:uppercase;margin:0 0 4px">${s.label}</p>
            <p style="color:#1b3d2f;font-size:14px;font-weight:700;margin:0">${s.value}</p>
          </div>
        `).join('')}
      </div>

      ${vsCountry !== null ? `
        <div style="background:${vsCountry < 0 ? '#f2f9f5' : '#fef9ec'};border:1px solid ${vsCountry < 0 ? '#c3e4d1' : '#fde68a'};border-radius:10px;padding:14px;margin-bottom:20px">
          <p style="margin:0;color:#1b3d2f;font-size:13px">
            ${vsCountry < 0
              ? `✅ You emitted <strong>${Math.abs(vsCountry)}% less</strong> than the average person in your country this week. Amazing!`
              : `⚡ You emitted <strong>${vsCountry}% more</strong> than your country average. Try reducing transport or food emissions this week.`
            }
          </p>
        </div>
      ` : ''}

      <div style="background:#0e221b;border-radius:12px;padding:20px;margin-bottom:24px">
        <p style="color:#97ceb1;font-size:12px;font-weight:700;text-transform:uppercase;margin:0 0 10px">💡 This week's tip</p>
        <p style="color:#fff;font-size:14px;margin:0;line-height:1.6">
          Skip red meat just one day this week — it saves around 3.5 kg CO₂ per meal. That's like not driving for 18 km!
        </p>
      </div>

      <div style="text-align:center">
        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard"
          style="display:inline-block;background:#40926d;color:#fff;text-decoration:none;padding:12px 28px;border-radius:10px;font-weight:700;font-size:14px">
          View My Dashboard →
        </a>
      </div>
    </div>

    <div style="padding:20px 32px;border-top:1px solid #e1f2e7;text-align:center">
      <p style="color:#97ceb1;font-size:12px;margin:0">
        You're receiving this because weekly emails are enabled in your account.
        <br>Log in to <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="color:#40926d">CarbonTrace</a> to update your preferences.
      </p>
    </div>
  </div>
</body>
</html>`;
};

const sendWeeklyEmails = async () => {
  let nodemailer;
  try {
    nodemailer = require('nodemailer');
  } catch {
    logger.warn('nodemailer not installed. Run: npm install nodemailer');
    return;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    logger.warn('SMTP not configured — skipping weekly emails. Add SMTP_HOST, SMTP_USER, SMTP_PASS to .env');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  // FIX: use scope 'withEmail' to actually get the email field (excluded by default scope)
  const users = await User.scope('withEmail').findAll({
    where: { weeklyEmailEnabled: true, role: 'individual' },
    attributes: ['id', 'name', 'email', 'country', 'streakDays', 'points'],
  });

  logger.info(`Sending weekly emails to ${users.length} users`);

  const now = new Date();
  const startOfWeek = new Date(now - (now.getDay() * 86400000)).toISOString().split('T')[0];
  const startOfLastWeek = new Date(now - ((now.getDay() + 7) * 86400000)).toISOString().split('T')[0];
  const endOfLastWeek = new Date(now - ((now.getDay() + 1) * 86400000)).toISOString().split('T')[0];

  let sent = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const [thisWeekKg, lastWeekKg, topCat] = await Promise.all([
        EmissionEntry.sum('co2eKg', { where: { userId: user.id, date: { [Op.gte]: startOfWeek } } }),
        EmissionEntry.sum('co2eKg', { where: { userId: user.id, date: { [Op.between]: [startOfLastWeek, endOfLastWeek] } } }),
        EmissionEntry.findOne({
          attributes: ['category', [fn('SUM', col('co2eKg')), 'total']],
          where: { userId: user.id, date: { [Op.gte]: startOfWeek } },
          group: ['category'],
          order: [[fn('SUM', col('co2eKg')), 'DESC']],
          raw: true,
        }),
      ]);

      const stats = {
        thisWeekKg: thisWeekKg || 0,
        lastWeekKg: lastWeekKg || 0,
        topCategory: topCat?.category || null,
        streak: user.streakDays || 0,
        points: user.points || 0,
      };

      await transporter.sendMail({
        from: `"CarbonTrace" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: user.email,
        subject: `Your weekly carbon summary 🌿`,
        html: buildEmailHtml(user, stats),
      });

      sent++;
    } catch (err) {
      logger.error(`Failed to send email to user ${user.id}:`, err.message);
      failed++;
    }
  }

  logger.info(`Weekly emails: ${sent} sent, ${failed} failed`);
};

module.exports = { sendWeeklyEmails };