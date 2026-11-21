const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');

const router = express.Router();


const getKeys = () =>
  [process.env.GROQ_API_KEY, process.env.GROQ_API_KEY_2, process.env.GROQ_API_KEY_3].filter(Boolean);

const callGroq = async (payload) => {
  const keys = getKeys();
  if (!keys.length) throw new Error('NO_GROQ_KEYS');
  let lastStatus = 502;
  for (const key of keys) {
    try {
      const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
        body: JSON.stringify(payload),
      });
      if (r.ok) return await r.json();
      lastStatus = r.status;
    } catch {
      lastStatus = 502;
    }
  }
  const err = new Error(`GROQ_${lastStatus}`);
  err.status = lastStatus;
  throw err;
};

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => String(req.user?.id || req.ip),
});

router.post('/tips', authenticate, limiter, async (req, res) => {
  const { totalKg = 0, topSources = [], streakDays = 0, city, state, country = 'India' } = req.body || {};

  const location = city ? `${city}${state ? ', ' + state : ''}` : country;
  const top = topSources.map((s) => `${s.category}: ${s.kg} kg`).join(', ') || 'none yet';
  const prompt = `User data:
Location: ${location}
This month: ${Math.round(totalKg)} kg CO2e
Top sources: ${top}
Streak: ${streakDays} days

Give 3 short personalised tips. Max 2 sentences each. Simple language. Positive tone.
Reply ONLY with JSON: {"tips":[{"icon":"emoji","title":"...","desc":"..."}]}`;

  try {
    const data = await callGroq({
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: 'You are a carbon footprint coach. Reply ONLY with valid JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1500,
      reasoning_effort: 'low',
      response_format: { type: 'json_object' },
    });
    const content = data?.choices?.[0]?.message?.content || '';
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(502).json({ error: err.message || 'TIPS_UNAVAILABLE' });
  }
});

router.post('/chat', authenticate, limiter, async (req, res) => {
  const { system = '', messages = [] } = req.body || {};
  const clean = (Array.isArray(messages) ? messages : [])
    .slice(-8)
    .filter((m) => ['user', 'assistant'].includes(m?.role) && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 1000) }));
  if (!clean.length) return res.status(400).json({ error: 'NO_MESSAGES' });

  try {
    const data = await callGroq({
      model: 'openai/gpt-oss-120b',
      messages: [{ role: 'system', content: String(system).slice(0, 4000) }, ...clean],
      max_tokens: 1500,
      reasoning_effort: 'low',
      temperature: 0.6,
    });
    res.json({ reply: data?.choices?.[0]?.message?.content || '' });
  } catch (err) {
    res.status(502).json({ error: err.message || 'CHAT_UNAVAILABLE' });
  }
});

module.exports = router;
