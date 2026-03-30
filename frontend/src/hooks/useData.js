import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import useAuthStore from '../context/authStore';

axios.interceptors.request.use(config => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const useEmissions = () => {
  const [emissions, setEmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchEmissions = useCallback(async () => {
    if (user?.role !== 'individual') { setLoading(false); return; }
    try {
      const res = await axios.get('/api/emissions?limit=200');
      setEmissions(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch emissions', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  // FIX: removed fetchEmissions() call from inside addEmission to avoid double-fetch.
  // The modal calls refetch() itself after a successful add.
  const addEmission = async (activityData) => {
    try {
      const res = await axios.post('/api/emissions', activityData);
      // FIX: return full server data so modal can display actual pointsEarned
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
      // Ensure all numeric fields are actually numbers before sending
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

  useEffect(() => { fetchEmissions(); }, [fetchEmissions]);
  return { emissions, loading, addEmission, runQuiz, refetch: fetchEmissions };
};

export const useScopeReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  const fetchReports = useCallback(async () => {
    if (user?.role !== 'business_admin') { setLoading(false); return; }
    try {
      const res = await axios.get('/api/scopes/reports');
      setReports(res.data);
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

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

  useEffect(() => { fetchReports(); }, [fetchReports]);
  return { reports, loading, createReport };
};

// ── Static fallback tips — shown when Gemini quota exceeded ─────────────────
const FALLBACK_TIPS = [
  { icon: '🚗', title: 'Reduce short car trips', desc: 'Walk or cycle for trips under 2 km to significantly cut fuel emissions.', saving: 'Save ~200 kg/year' },
  { icon: '🥗', title: 'Try meat-free days',     desc: 'Cutting meat twice a week is one of the highest-impact diet changes you can make.', saving: 'Save ~150 kg/year' },
  { icon: '💡', title: 'Switch to LED lighting', desc: 'LED bulbs use 75% less energy than old bulbs — easy swap, big impact.', saving: 'Save ~80 kg/year' },
];

const callGemini = async (prompt) => {
  const KEYS = [
    import.meta.env.VITE_GEMINI_API_KEY,
    import.meta.env.VITE_GEMINI_KEY_1,
    import.meta.env.VITE_GEMINI_KEY_2,
  ].filter(Boolean);

  if (KEYS.length === 0) throw new Error('NO_KEYS');

  for (const key of KEYS) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      }
    );
    if (res.status === 429) continue;
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return await res.json();
  }

  throw new Error('429');
};

export const useAITips = (emissions, user, userLocation = null) => {
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateTips = useCallback(async () => {
    if (!emissions?.length) return;

    const today = new Date().toISOString().slice(0, 10);
    const cacheKey = `ai_tips_${user?.id}_${today}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setTips(JSON.parse(cached));
        return;
      }
    } catch {}

    const fallbackKey = `ai_fallback_${today}`;
    if (localStorage.getItem(fallbackKey)) {
      setTips(FALLBACK_TIPS);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const monthlyEmissions = emissions.filter(e => e.date >= startOfMonth);
      const totals = {};
      monthlyEmissions.forEach(e => {
        const cat = e.category || 'other';
        totals[cat] = (totals[cat] || 0) + parseFloat(e.co2eKg || 0);
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

      const prompt = `You are a carbon footprint coach. User data:
${locationCtx}
This month: ${Math.round(totalKg)} kg CO2e
Top sources: ${topSources || 'none yet'}
Streak: ${user?.streakDays || 0} days

Give 3 short personalised tips. Max 2 sentences each. Simple language. Positive tone.

Reply ONLY with this exact JSON, no markdown:
{"tips":[{"icon":"🚗","title":"tip title","desc":"advice","saving":"Save ~X kg/year"},{"icon":"🥗","title":"tip title","desc":"advice","saving":"Save ~X kg/year"},{"icon":"💡","title":"tip title","desc":"advice","saving":"Save ~X kg/year"}]}`;

      const data = await callGemini(prompt);
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);

      if (!parsed.tips || !Array.isArray(parsed.tips)) throw new Error('bad format');

      try { localStorage.setItem(cacheKey, JSON.stringify(parsed.tips)); } catch {}
      setTips(parsed.tips);

    } catch (err) {
      try { localStorage.setItem(fallbackKey, '1'); } catch {}
      setTips(FALLBACK_TIPS);
    } finally {
      setLoading(false);
    }
  }, [emissions?.length, user?.id]);

  return { tips, loading, error, generateTips };
};