// Express route: POST /api/ai/tips   (mount behind your existing auth middleware)
// Set GROQ_API_KEY in Render's environment variables. Never use a VITE_ variable for it.
import express from 'express';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const limiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 }); // 20 calls/user-IP/hour

router.post('/tips', limiter, async (req, res) => {
  const { totalKg = 0, topSources = [], streakDays = 0, city, state, country = 'India' } = req.body || {};

  const location = city ? `${city}${state ? ', ' + state : ''}` : country;
  const top = topSources.map((s) => `${s.category}: ${s.kg} kg`).join(', ') || 'none yet';

  // No kg-saving numbers in the prompt, so the model cannot just copy them.
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
        max_tokens: 1500,          // reasoning models need headroom or content comes back empty
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

export default router;
