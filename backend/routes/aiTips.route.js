const express = require('express');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });

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
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a carbon footprint coach. Reply ONLY with valid JSON.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        reasoning_effort: 'low',
        response_format: { type: 'json_object' },
      }),
    });
    if (!r.ok) return res.status(502).json({ error: `GROQ_${r.status}` });
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || '';
    res.json(JSON.parse(content));
  } catch {
    res.status(502).json({ error: 'TIPS_UNAVAILABLE' });
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
    const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: [{ role: 'system', content: String(system).slice(0, 4000) }, ...clean],
        max_tokens: 1500,
        reasoning_effort: 'low',
        temperature: 0.6,
      }),
    });
    if (!r.ok) return res.status(502).json({ error: `GROQ_${r.status}` });
    const data = await r.json();
    res.json({ reply: data?.choices?.[0]?.message?.content || '' });
  } catch {
    res.status(502).json({ error: 'CHAT_UNAVAILABLE' });
  }
});

module.exports = router;
