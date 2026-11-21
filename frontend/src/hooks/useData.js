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
  },
  {
    icon: '🥗',
    title: 'Try meat-free days',
    desc: 'Cutting meat twice a week is one of the highest-impact diet changes you can make.',
  },
  {
    icon: '💡',
    title: 'Switch to LED lighting',
    desc: 'LED bulbs use 75% less energy than old bulbs — easy swap, big impact.',
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
    saving: item?.saving ? String(item.saving) : '',
  }));
};

// Tips are generated on the server (/api/ai/tips) so the Groq key never reaches the browser.
const inflight = new Map();           // dedupes concurrent requests for the same cache key
const FAIL_COOLDOWN_MS = 30 * 60 * 1000;

const readCache = (key) => {
  try {
    const raw = JSON.parse(localStorage.getItem(key));
    const tips = Array.isArray(raw) ? raw : raw?.tips;   // supports old array format
    return Array.isArray(tips) && tips.length > 0 ? tips : null;
  } catch {
    return null;
  }
};

const recentlyFailed = (key) => {
  try {
    const t = Number(sessionStorage.getItem(`${key}_failed_at`));
    return t && Date.now() - t < FAIL_COOLDOWN_MS;
  } catch {
    return false;
  }
};

// Counts real network requests so the paper can report a measured number.
const countRequest = () => {
  try {
    const n = Number(sessionStorage.getItem('ai_tips_requests') || 0) + 1;
    sessionStorage.setItem('ai_tips_requests', String(n));
  } catch {}
};

export const useAITips = (emissions, user, userLocation = null) => {
  const [tips, setTips] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const hasData = Array.isArray(emissions) && emissions.length > 0;
  const today = new Date().toISOString().slice(0, 10);
  const cacheKey = `ai_tips_${user?.id || 'guest'}_${today}`;

  const generateTips = useCallback(async () => {
    if (!hasData) return;

    // 1) cache hit: no network
    const cached = readCache(cacheKey);
    if (cached) {
      setTips(cached);
      setError(null);
      return;
    }

    // 2) a recent failure: show fallback, don't retry on every load
    if (recentlyFailed(cacheKey)) {
      setTips(FALLBACK_TIPS);
      setError('TIPS_FALLBACK');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 3) one request per key at a time
      if (!inflight.has(cacheKey)) {
        const n = new Date();   // local date: toISOString() shifts to the previous day in IST
        const startOfMonth = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-01`;

        const totals = {};
        emissions
          .filter((e) => (e?.date || '') >= startOfMonth)
          .forEach((e) => {
            const cat = (e?.category || 'other').toLowerCase();
            totals[cat] = (totals[cat] || 0) + (parseFloat(e?.co2eKg) || 0);
          });

        const summary = {
          totalKg: Math.round(Object.values(totals).reduce((a, b) => a + b, 0)),
          topSources: Object.entries(totals)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([category, kg]) => ({ category, kg: Math.round(kg) })),
          streakDays: user?.streakDays || 0,
          city: userLocation?.city || null,
          state: userLocation?.state || null,
          country: user?.country || 'India',
        };

        countRequest();
        const p = axios
          .post('/api/ai/tips', summary)
          .then((res) => parseTipsJson(JSON.stringify(res.data)))
          .finally(() => inflight.delete(cacheKey));
        inflight.set(cacheKey, p);
      }

      const generated = await inflight.get(cacheKey);
      if (!generated) throw new Error('INVALID_TIPS_JSON');

      try {
        localStorage.setItem(cacheKey, JSON.stringify({ tips: generated, ts: Date.now() }));
      } catch {}
      setTips(generated);
    } catch (err) {
      try {
        sessionStorage.setItem(`${cacheKey}_failed_at`, String(Date.now()));
      } catch {}
      setError(err?.message || 'TIPS_FALLBACK');
      setTips(FALLBACK_TIPS);
    } finally {
      setLoading(false);
    }
    // hasData (boolean), not emissions.length: logging a new activity must not re-trigger this
  }, [hasData, cacheKey, user?.country, user?.streakDays, userLocation?.city, userLocation?.state]);

  useEffect(() => {
    generateTips();
  }, [generateTips]);

  return { tips, loading, error, generateTips };
};
