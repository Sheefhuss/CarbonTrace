export const formatCO2 = (kg) => {
  if (kg == null) return '0 kg';
  if (kg >= 1000) return `${(kg / 1000).toFixed(2)} t CO₂e`;
  return `${Math.round(kg)} kg CO₂e`;
};

export const fmtDate = (dateString) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
};

export const SCOPES = {
  scope1: { label: 'Scope 1', desc: 'Direct emissions from owned sources', color: '#40926d' },
  scope2: { label: 'Scope 2', desc: 'Indirect emissions from purchased energy', color: '#64b18c' },
  scope3: { label: 'Scope 3', desc: 'All other indirect emissions in value chain', color: '#97ceb1' },
};

export const footprintContext = (totalKg) => {
  if (totalKg < 4000) return { label: 'Excellent — below average', color: '#40926d' };
  if (totalKg < 8000) return { label: 'Good — average range', color: '#ca8a04' };
  return { label: 'High — above average', color: '#ef4444' };
};

export const co2Equivalents = (kg) => {
  if (!kg || kg <= 0) return [];
  const all = [
    { icon: '🚗', text: `${Math.round(kg / 0.192)} km driven in a petrol car` },
    { icon: '🥗', text: `${Math.round(kg / 1.2)} vegetarian meals equivalent` },
    { icon: '🌳', text: `${Math.round(kg / 21)} trees needed 1 year to absorb this` },
    { icon: '✈️', text: `${Math.round(kg / 255)} km of economy flight` },
    { icon: '💡', text: `${Math.round(kg / 0.82)} kWh of Indian grid electricity` },
  ];
  return all.filter(e => {
    const n = parseInt(e.text);
    return n >= 1 && n < 99999;
  }).slice(0, 3);
};

export const COUNTRY_AVERAGES = {
  IND:   { name: 'India',          kgPerMonth: 150  },
  USA:   { name: 'United States',  kgPerMonth: 1500 },
  GBR:   { name: 'United Kingdom', kgPerMonth: 750  },
  DEU:   { name: 'Germany',        kgPerMonth: 870  },
  FRA:   { name: 'France',         kgPerMonth: 600  },
  AUS:   { name: 'Australia',      kgPerMonth: 1400 },
  CAN:   { name: 'Canada',         kgPerMonth: 1380 },
  BRA:   { name: 'Brazil',         kgPerMonth: 220  },
  CHN:   { name: 'China',          kgPerMonth: 580  },
  WORLD: { name: 'World Average',  kgPerMonth: 400  },
};

export const detectUserLocation = () =>
  new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const state = data.address?.state || data.address?.region || null;
          const city = data.address?.city || data.address?.town || data.address?.village || null;
          const country = data.address?.country_code?.toUpperCase() || null;
          resolve({ state, city, country, latitude, longitude });
        } catch {
          resolve(null);
        }
      },
      () => resolve(null),
      { timeout: 5000 }
    );
  });

export const DAILY_FACTS = [
  { fact: 'A vegetarian meal produces about 1.2 kg CO₂ — same as driving 6 km in a petrol car.', emoji: '🍛' },
  { fact: 'If everyone ate plant-based, global food emissions would drop by 70%.', emoji: '🥗' },
  { fact: 'Aviation is 3–4× more warming than its CO₂ alone, because of contrails.', emoji: '✈️' },
  { fact: 'One tree absorbs ~21 kg CO₂/year. It takes 50 trees to offset an average Indian\'s annual footprint.', emoji: '🌳' },
  { fact: 'India\'s electricity grid emits 0.82 kg CO₂ per kWh — one of the highest in the world.', emoji: '⚡' },
  { fact: 'EVs in India still emit ~0.053 kg CO₂/km due to the coal grid — but that\'s 4× better than petrol.', emoji: '🔋' },
  { fact: 'The fashion industry produces 10% of all global CO₂ — more than aviation and shipping combined.', emoji: '👕' },
  { fact: 'Food waste causes 8% of global greenhouse gases. Buying only what you need matters.', emoji: '🗑️' },
  { fact: 'Going vegetarian saves ~0.5 tonnes CO₂ per person per year on average.', emoji: '🥦' },
  { fact: 'Working from home one extra day/week saves ~200 kg CO₂/year from commuting.', emoji: '🏠' },
  { fact: 'Charging your phone daily for a year produces about 1 kg CO₂ — tiny compared to diet.', emoji: '📱' },
  { fact: 'Rice paddies produce methane — 1 kg of rice emits ~4.45 kg CO₂e from flooded fields.', emoji: '🍚' },
  { fact: 'LED bulbs use 75% less energy than old bulbs, saving 60+ kg CO₂/year per home.', emoji: '💡' },
  { fact: 'The average Indian emits ~1.9 tonnes CO₂/year — one of the lowest globally, but rising.', emoji: '🇮🇳' },
  { fact: 'Methane is 80× more potent than CO₂ over 20 years. Livestock is the biggest methane source.', emoji: '🐄' },
  { fact: 'Solar panels in India generate electricity at ~0.05 kg CO₂/kWh — 16× cleaner than coal.', emoji: '☀️' },
  { fact: 'Taking the train instead of flying for 500 km cuts emissions by ~85%.', emoji: '🚆' },
  { fact: 'A smartphone\'s biggest carbon cost is manufacturing — 80% of its lifetime emissions.', emoji: '📲' },
  { fact: 'Keeping your home 1°C cooler reduces heating emissions by ~8%.', emoji: '🌡️' },
  { fact: 'Buying second-hand clothing saves ~3 kg CO₂ per item compared to buying new.', emoji: '🛍️' },
  { fact: 'Global deforestation causes ~15% of all greenhouse gas emissions annually.', emoji: '🪵' },
  { fact: 'Eating chicken instead of mutton cuts your meal\'s carbon footprint significantly.', emoji: '🍗' },
  { fact: 'India aims to reach net-zero by 2070 — 20 years after the EU.', emoji: '🎯' },
  { fact: 'Composting food waste instead of landfilling reduces its emissions by 95%.', emoji: '♻️' },
  { fact: 'The average car spends 95% of its life parked. E-bikes have a footprint 10× lower per km.', emoji: '🛵' },
  { fact: 'Carbon credits fund projects like reforestation or renewables to offset emissions elsewhere.', emoji: '💳' },
  { fact: 'The top 10% of global emitters cause 50% of all emissions.', emoji: '📊' },
  { fact: 'Ocean shipping is the most efficient way to move goods, producing just 2.5% of global CO₂.', emoji: '🚢' },
  { fact: 'Concrete production causes ~8% of global CO₂ emissions.', emoji: '🏗️' },
  { fact: 'Reducing meat consumption saves ~400 kg CO₂ per person per year.', emoji: '🥗' },
];

export const getDailyFact = () => {
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return DAILY_FACTS[day % DAILY_FACTS.length];
};

// Internal helper for date calculations
const getWeekStart = () => {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
  return new Date(new Date(now).setDate(diff)).toISOString().split('T')[0];
};

const getISOWeekKey = () => {
  const now = new Date();
  const jan1 = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
};

export const getCurrentWeekKey = getISOWeekKey;

export const BADGES = [
  { id: 'first_log',    icon: '🌱', name: 'First Step',    desc: 'Logged your first activity',            condition: (s) => s.totalLogs >= 1 },
  { id: 'week_streak',  icon: '🔥', name: '7-Day Streak',  desc: 'Used the app 7 days in a row',          condition: (s) => s.streakDays >= 7 },
  { id: 'month_streak', icon: '⚡', name: '30-Day Streak', desc: 'Used the app 30 days in a row',         condition: (s) => s.streakDays >= 30 },
  { id: 'ten_logs',     icon: '📊', name: 'Data Tracker',  desc: 'Logged 10 activities',                  condition: (s) => s.totalLogs >= 10 },
  { id: 'fifty_logs',   icon: '🏆', name: 'Committed',     desc: 'Logged 50 activities',                  condition: (s) => s.totalLogs >= 50 },
  { id: 'below_avg',    icon: '🌍', name: 'Below Average', desc: 'Monthly footprint below world average', condition: (s) => s.monthlyKg > 0 && s.monthlyKg < 400 },
  { id: 'offset_1t',    icon: '🌲', name: 'Tree Planter',  desc: 'Offset 1 tonne of CO₂',                condition: (s) => s.totalOffsetKg >= 1000 },
  { id: 'quiz_done',    icon: '📝', name: 'Self-Aware',    desc: 'Completed the footprint quiz',          condition: (s) => s.hasBaseline },
  { id: 'veg_week',     icon: '🥗', name: 'Green Plate',   desc: '7 plant-based meals logged',            condition: (s) => s.vegMeals >= 7 },
  { id: 'no_car',       icon: '🚶', name: 'Car-Free',      desc: 'Logged 5 zero-emission trips',          condition: (s) => s.zeroCarbonTrips >= 5 },
  { id: 'century',      icon: '💯', name: 'Century Club',  desc: 'Earned 100 points',                     condition: (s) => s.points >= 100 },
  { id: 'friend_made',  icon: '🤝', name: 'Connected',     desc: 'Added your first friend',               condition: (s) => s.friends >= 1 },
];

export const computeBadges = (user, emissions) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthlyKg = emissions
    .filter(e => e.date >= startOfMonth)
    .reduce((sum, e) => sum + parseFloat(e.co2eKg || 0), 0);
  const vegMeals = emissions.filter(e => {
    const s = (e.subCategory || '').toLowerCase();
    return s.includes('vegan') || s.includes('vegetarian') || s.includes('plant') || s.includes('dal');
  }).length;
  const zeroCarbonTrips = emissions.filter(e => {
    const s = (e.subCategory || '').toLowerCase();
    return s.includes('bicycle') || s.includes('walk') || parseFloat(e.co2eKg || 0) === 0;
  }).length;

  const stats = {
    totalLogs: emissions.length,
    streakDays: user?.streakDays || 0,
    monthlyKg,
    totalOffsetKg: user?.totalOffsetKg || 0,
    hasBaseline: !!user?.baselineFootprint,
    vegMeals,
    zeroCarbonTrips,
    points: user?.points || 0,
    friends: (user?.friends || []).length,
  };
  return BADGES.map(b => ({ ...b, earned: b.condition(stats) }));
};

const ALL_CHALLENGES = [
  {
    id: 'no_meat_week',
    icon: '🥗',
    name: 'No-Meat Week',
    desc: 'Log 7 plant-based meals this week',
    target: 7,
    unit: 'meals',
    points: 60,
    type: 'weekly',
    check: (emissions) => {
      const weekStart = getWeekStart();
      return emissions.filter(e => {
        if (e.date < weekStart) return false;
        const s = (e.subCategory || '').toLowerCase();
        return s.includes('vegan') || s.includes('vegetarian') || s.includes('plant');
      }).length;
    },
  },
  {
    id: 'green_commute',
    icon: '🚌',
    name: 'Green Commute',
    desc: '5 eco-friendly trips this week',
    target: 5,
    unit: 'trips',
    points: 50,
    type: 'weekly',
    check: (emissions) => {
      const weekStart = getWeekStart();
      return emissions.filter(e => {
        if (e.date < weekStart) return false;
        const s = (e.subCategory || '').toLowerCase();
        return s.includes('bus') || s.includes('metro') || s.includes('walk') || s.includes('bicycle');
      }).length;
    },
  },
  {
    id: 'low_carbon',
    icon: '🌱',
    name: 'Low Carbon',
    desc: 'Log 5 entries under 2kg CO₂',
    target: 5,
    unit: 'logs',
    points: 40,
    type: 'weekly',
    check: (emissions) => {
      const weekStart = getWeekStart();
      return emissions.filter(e => e.date >= weekStart && parseFloat(e.co2eKg || 0) <= 2).length;
    },
  },
  {
    id: 'streak_master',
    icon: '🔥',
    name: 'Streak Master',
    desc: 'Maintain a 5-day streak',
    target: 5,
    unit: 'days',
    points: 70,
    type: 'streak',
    check: (_, user) => Math.min(user?.streakDays || 0, 5),
  },
  {
    id: 'transport_focus',
    icon: '🚗',
    name: 'Transport Control',
    desc: 'Reduce transport entries',
    target: 3,
    unit: 'low trips',
    points: 45,
    type: 'dynamic',
    check: (emissions) => {
      const weekStart = getWeekStart();
      return emissions.filter(e => e.date >= weekStart && e.category !== 'transport').length;
    },
  }
];

const getWeekSeed = () => {
  const now = new Date();
  return `${now.getFullYear()}-${Math.ceil((now.getDate() + 6 - now.getDay()) / 7)}`;
};

const seededShuffle = (array, seed) => {
  let result = [...array];
  let random = seed.split('').reduce((a, c) => a + c.charCodeAt(0), 0);

  for (let i = result.length - 1; i > 0; i--) {
    random = (random * 9301 + 49297) % 233280;
    const j = Math.floor((random / 233280) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const CHALLENGES = (() => {
  const seed = getWeekSeed();
  return seededShuffle(ALL_CHALLENGES, seed).slice(0, 3);
})();
