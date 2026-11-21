import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useAuthStore from '../context/authStore';

axios.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useEmissions = () => {
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchEmissions = useCallback(async () => {
    if (user?.role !== 'individual') {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get('/api/emissions?limit=200');
      setEmissions(res.data?.data || []);
    } catch (err) {
      console.error('Failed to fetch emissions', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  const addEmission = async (activityData) => {
    try {
      const res = await axios.post('/api/emissions', activityData);
      return { ok: true, data: res.data };
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Failed to save activity';
      return { ok: false, error: message };
    }
  };

  const runQuiz = async (answers) => {
    try {
      const payload = Object.fromEntries(
        Object.entries(answers).map(([k, v]) => [k, isNaN(v) ? v : Number(v)])
      );
      const res = await axios.post('/api/emissions/estimate', payload);
      return res.data;
    } catch (err) {
      console.error('Quiz failed', err);
      return null;
    }
  };

  useEffect(() => {
    fetchEmissions();
  }, [fetchEmissions]);

  return { emissions, loading, addEmission, runQuiz, refetch: fetchEmissions };
};

export const useScopeReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchReports = useCallback(async () => {
    if (user?.role !== 'business_admin') {
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get('/api/scopes/reports');
      setReports(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role]);

  const createReport = async (data) => {
    try {
      await axios.post('/api/scopes/reports', data);
      await fetchReports();
      return { ok: true };
    } catch (err) {
      const message =
        err.response?.data?.error ||
        err.response?.data?.errors?.[0]?.msg ||
        'Failed to create report';
      return { ok: false, error: message };
    }
  };

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, createReport };
};

const FALLBACK_TIPS = [
  {
    icon: '🚗',
    title: 'Reduce short car trips',
    desc: 'Walk or cycle for trips under 2 km to significantly cut fuel emissions.',
    saving: 'Save ~200 kg/year',
  },
  {
    icon: '🥗',
    title: 'Try meat-free days',
    desc: 'Cutting meat twice a week is one of the highest-impact diet changes you can make.',
    saving: 'Save ~150 kg/year',
  },
  {
    icon: '💡',
    title: 'Switch to LED lighting',
    desc: 'LED bulbs use 75% less energy than old bulbs — easy swap, big impact.',
    saving: 'Save ~80 kg/year',
  },
];

const parseTipsJson = (rawText) => {
  if (!rawText || typeof rawText !== 'string') return null;
  const cleaned = rawText
    .replace(/```json|```/gi, '')
    .trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  const candidate = jsonMatch ? jsonMatch[0] : cleaned;
  const parsed = JSON.parse(candidate);

  if (!parsed || !Array.isArray(parsed.tips) || parsed.tips.length === 0) {
    return null;
  }

  return parsed.tips.slice(0, 3).map((item, idx) => ({
    icon: item?.icon || FALLBACK_TIPS[idx]?.icon || '🌿',
    title: String(item?.title || FALLBACK_TIPS[idx]?.title || 'Eco Tip'),
    desc: String(item?.desc || FALLBACK_TIPS[idx]?.desc || ''),
    saving: String(item?.saving || FALLBACK_TIPS[idx]?.saving || 'Save ~100 kg/year'),
  }));
};

const callGroqTips = async (prompt) => {
  const keys = [
    import.meta.env.VITE_GROQ_API_KEY_2,
    import.meta.env.VITE_GROQ_API_KEY_3,
    import.meta.env.VITE_GROQ_API_KEY,
  ].filter(Boolean);

  if (keys.length === 0) {
    throw new Error('NO_GROQ_KEYS');
  }

  let lastError = null;

  for (const apiKey of keys) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-120b',
          messages: [
            {
              role: 'system',
              content:
                'You are a carbon footprint coach. Reply ONLY with valid JSON, no markdown or extra text.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 400,
        }),
      });

      if (res.status === 429) {
        lastError = new Error('GROQ_RATE_LIMIT_429');
        continue;
      }

      if (!res.ok) {
        lastError = new Error(`GROQ_API_ERROR_${res.status}`);
        continue;
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content || '';
      const validTips = parseTipsJson(content);

      if (!validTips) {
        lastError = new Error('INVALID_TIPS_JSON');
        continue;
      }

      return validTips;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError || new Error('ALL_GROQ_KEYS_FAILED');
};

export const useAITips = (emissions, user, userLocation = null) => {
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateTips = useCallback(async () => {
    if (!Array.isArray(emissions) || emissions.length === 0) return;

    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `ai_tips_${user?.id || 'guest'}_${today}`;

    try {
      const cachedRaw = localStorage.getItem(cacheKey);
      if (cachedRaw) {
        const cachedTips = JSON.parse(cachedRaw);
        if (Array.isArray(cachedTips) && cachedTips.length > 0) {
          setTips(cachedTips);
          setError(null);
          return;
        }
      }
    } catch {}

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split('T')[0];

      const monthlyEmissions = emissions.filter((e) => (e?.date || '') >= startOfMonth);
      const totals = {};

      monthlyEmissions.forEach((e) => {
        const cat = (e?.category || 'other').toLowerCase();
        totals[cat] = (totals[cat] || 0) + (parseFloat(e?.co2eKg) || 0);
      });

      const totalKg = Object.values(totals).reduce((a, b) => a + b, 0);
      const topSources = Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([cat, kg]) => `${cat}: ${Math.round(kg)} kg`)
        .join(', ');

      const locationCtx = userLocation?.city
        ? `Location: ${userLocation.city}${userLocation.state ? ', ' + userLocation.state : ''}`
        : `Country: ${user?.country || 'India'}`;

      const prompt = `User data:
${locationCtx}
This month: ${Math.round(totalKg)} kg CO2e
Top sources: ${topSources || 'none yet'}
Streak: ${user?.streakDays || 0} days

Give 3 short personalised tips. Max 2 sentences each. Simple language. Positive tone.

Reply ONLY with this exact JSON, no markdown:
{"tips":[{"icon":"🚗","title":"tip title","desc":"advice","saving":"Save ~200 kg/year"},{"icon":"🥗","title":"tip title","desc":"advice","saving":"Save ~150 kg/year"},{"icon":"💡","title":"tip title","desc":"advice","saving":"Save ~80 kg/year"}]}`;

      const generated = await callGroqTips(prompt);

      try {
        localStorage.setItem(cacheKey, JSON.stringify(generated));
      } catch {}

      setTips(generated);
    } catch (err) {
      setError(err?.message || 'TIPS_FALLBACK');
      setTips(FALLBACK_TIPS);
    } finally {
      setLoading(false);
    }
  }, [emissions?.length, user?.id, user?.country, user?.streakDays, userLocation?.city, userLocation?.state]);

  useEffect(() => {
    generateTips();
  }, [generateTips]);

  return { tips, loading, error, generateTips };
};
