

import React, { useState, useMemo } from 'react';
import { X, CheckCircle, Zap, Leaf, TrendingDown } from 'lucide-react';
import { useEmissions } from '../hooks/useData';
import { co2Equivalents } from '../utils/helpers';
import clsx from 'clsx';

// FIX: subCategory values now match the FALLBACK_FACTORS keys in backend/routes/emissions.js
const ACTIVITIES = {
  transport: {
    label: 'Transport',
    icon: '🚗',
    options: [
      { value: 'Personal Car (Gasoline)', label: 'Petrol / CNG Car',  emoji: '🚗', unit: 'km',       factor: 0.192, hint: 'km driven today'  },
      { value: 'Personal Car (EV)',       label: 'Electric Vehicle',   emoji: '⚡', unit: 'km',       factor: 0.053, hint: 'km driven today'  },
      { value: 'Bus / Public Transit',    label: 'Bus / Metro / Auto', emoji: '🚌', unit: 'km',       factor: 0.105, hint: 'km travelled'      },
      { value: 'Flight (Domestic)',       label: 'Domestic Flight',    emoji: '✈️', unit: 'km',       factor: 0.255, hint: 'one-way distance'  },
      { value: 'Bicycle / Walk',          label: 'Bicycle / Walking',  emoji: '🚲', unit: 'km',       factor: 0,     hint: 'zero emissions!'   },
    ],
  },
  food: {
    label: 'Food',
    icon: '🍽️',
    options: [
      { value: 'White Meat (Chicken / Fish / Seafood)',     label: 'Chicken / Fish',         emoji: '🍗', unit: 'servings', factor: 1.5, hint: 'number of meals' },
      { value: 'Vegetarian (Dairy-Heavy / Paneer / Ghee)',  label: 'Veg with Dairy (Paneer)', emoji: '🧀', unit: 'servings', factor: 2.0, hint: 'number of meals' },
      { value: 'Vegetarian (Standard Dal / Rice / Sabzi)',  label: 'Dal / Rice / Sabzi',      emoji: '🍛', unit: 'servings', factor: 1.2, hint: 'number of meals' },
      { value: 'Fast Food / Street Food (Mixed)',           label: 'Street Food / Fast Food', emoji: '🍔', unit: 'servings', factor: 1.0, hint: 'number of meals' },
      { value: 'Vegan (Strictly Plant-Based)',              label: 'Fully Plant-Based',       emoji: '🥦', unit: 'servings', factor: 0.8, hint: 'number of meals' },
    ],
  },
  shopping: {
    label: 'Shopping',
    icon: '🛍️',
    options: [
      { value: 'Clothing / Fast Fashion', label: 'Clothing / Fashion',     emoji: '👕', unit: 'USD', factor: 0.5, hint: 'amount spent' },
      { value: 'Electronics',             label: 'Electronics / Gadgets',  emoji: '📱', unit: 'USD', factor: 1.2, hint: 'amount spent' },
      { value: 'Furniture',               label: 'Furniture / Home Goods', emoji: '🛋️', unit: 'USD', factor: 0.8, hint: 'amount spent' },
    ],
  },
};

const CO2_LEVELS = [
  { max: 0,    label: 'Zero emissions',  color: '#34d399', icon: '🌟' },
  { max: 2,    label: 'Very low impact', color: '#40926d', icon: '🌱' },
  { max: 10,   label: 'Low impact',      color: '#64b18c', icon: '✅' },
  { max: 30,   label: 'Medium impact',   color: '#f59e0b', icon: '⚠️' },
  { max: 9999, label: 'High impact',     color: '#ef4444', icon: '🔴' },
];

const getCO2Level = (kg) => CO2_LEVELS.find(l => kg <= l.max) || CO2_LEVELS[CO2_LEVELS.length - 1];

export default function LogActivityModal({ onClose }) {
  const [activeTab, setActiveTab] = useState('transport');
  const [selected, setSelected] = useState(ACTIVITIES.transport.options[0]);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  const { addEmission, refetch } = useEmissions();
  const tab = ACTIVITIES[activeTab];

  const estimatedCo2 = useMemo(() => {
    const q = parseFloat(quantity);
    if (!q || q <= 0) return 0;
    return parseFloat((q * (selected?.factor || 0)).toFixed(2));
  }, [quantity, selected]);

  const level = getCO2Level(estimatedCo2);
  const equivalents = useMemo(() => co2Equivalents(estimatedCo2), [estimatedCo2]);
  const isLowCarbon = estimatedCo2 <= 2 && parseFloat(quantity) > 0;

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSelected(ACTIVITIES[tabId].options[0]);
    setQuantity('');
  };

  const handleSelect = (opt) => {
    setSelected(opt);
    setQuantity('');
  };

  const handleSubmit = async () => {
    if (!quantity || parseFloat(quantity) <= 0) return;
    setLoading(true);
    const result = await addEmission({
      category: activeTab,
      subCategory: selected.value,
      quantity: parseFloat(quantity),
      unit: selected.unit,
    });
    setLoading(false);
    if (result.ok) {
      // FIX: refetch once (addEmission no longer fetches internally)
      await refetch();
      // FIX: use actual pointsEarned from server response
      const pointsEarned = result.data?.pointsEarned ?? 2;
      const bonusReason = result.data?.bonusReason ?? null;
      setSuccess({ co2: estimatedCo2, isLowCarbon: bonusReason === 'low_carbon_bonus', pointsEarned });
      setTimeout(() => onClose(), 2000);
    } else {
      alert(result.error || 'Failed to save. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-forest-900 border border-white/10 rounded-2xl shadow-2xl p-8 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 rounded-full bg-forest-500/20 flex items-center justify-center">
            <CheckCircle size={32} className="text-forest-400" />
          </div>
          <div>
            <p className="text-xl font-bold text-white">Activity saved!</p>
            <p className="text-forest-300 text-sm mt-1">{success.co2} kg CO₂e logged</p>
          </div>
          {success.isLowCarbon && (
            <div className="bg-forest-500/15 border border-forest-400/30 rounded-xl px-4 py-3 w-full">
              <p className="text-forest-300 text-sm font-medium flex items-center justify-center gap-2">
                <Leaf size={14} /> Low-carbon bonus: <span className="text-white font-bold">+5 pts extra!</span>
              </p>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-forest-500">
            <Zap size={12} className="text-amber-400" />
            <span>+{success.pointsEarned} points earned</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-forest-900 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        <div className="flex items-center justify-between p-5 border-b border-white/10 shrink-0">
          <div>
            <h2 className="font-bold text-lg text-white">Log an Activity</h2>
            <p className="text-xs text-forest-400 mt-0.5">
              +2 pts per entry · +5 bonus for low-carbon activities
            </p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-white/10 text-forest-400 hover:text-white transition-all flex items-center justify-center">
            <X size={18} />
          </button>
        </div>

        <div className="flex border-b border-white/10 shrink-0">
          {Object.entries(ACTIVITIES).map(([id, t]) => (
            <button key={id} onClick={() => handleTabChange(id)}
              className={clsx(
                'flex-1 flex flex-col items-center gap-1 py-3 text-xs font-semibold transition-all',
                activeTab === id
                  ? 'text-forest-300 border-b-2 border-forest-400 bg-white/5'
                  : 'text-forest-500 hover:text-forest-300'
              )}>
              <span className="text-base">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {tab.options.map(opt => (
              <button key={opt.value} onClick={() => handleSelect(opt)}
                className={clsx(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all text-center',
                  selected?.value === opt.value
                    ? 'border-forest-400 bg-forest-500/20 scale-105'
                    : 'border-white/10 bg-white/3 hover:border-white/20 hover:bg-white/8'
                )}>
                <span className="text-2xl">{opt.emoji}</span>
                <span className={clsx(
                  'text-xs font-medium leading-tight',
                  selected?.value === opt.value ? 'text-white' : 'text-forest-300'
                )}>
                  {opt.label}
                </span>
                {opt.factor === 0 ? (
                  <span className="text-xs text-forest-400 font-bold">Zero CO₂</span>
                ) : (
                  <span className="text-xs text-forest-500">{opt.factor} kg/unit</span>
                )}
              </button>
            ))}
          </div>

          <div>
            <label className="label">
              {activeTab === 'transport' ? 'Distance in km' :
               activeTab === 'food' ? 'Number of meals / servings' :
               'Amount spent (USD)'}
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.1"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder={selected?.hint || 'Enter amount'}
                className="input pr-14"
                style={{ color: 'white', WebkitTextFillColor: 'white' }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-forest-400 font-semibold pointer-events-none">
                {selected?.unit}
              </span>
            </div>
          </div>

          {parseFloat(quantity) > 0 && (
            <div className="rounded-xl border overflow-hidden transition-all"
              style={{ borderColor: level.color + '40', backgroundColor: level.color + '10' }}>
              <div className="flex items-center justify-between p-3 pb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{level.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{estimatedCo2} kg CO₂e</p>
                    <p className="text-xs" style={{ color: level.color }}>{level.label}</p>
                  </div>
                </div>
                {isLowCarbon && (
                  <div className="flex items-center gap-1 bg-forest-500/20 px-2 py-1 rounded-full">
                    <Leaf size={10} className="text-forest-400" />
                    <span className="text-xs text-forest-300 font-bold">+5 bonus pts!</span>
                  </div>
                )}
              </div>
              {equivalents.length > 0 && (
                <div className="px-3 pb-3 space-y-1 border-t border-white/5 pt-2">
                  <p className="text-xs text-forest-500 mb-1">That's equivalent to:</p>
                  {equivalents.map((eq, i) => (
                    <p key={i} className="text-xs text-forest-300">{eq.icon} {eq.text}</p>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        <div className="p-5 pt-3 border-t border-white/5 shrink-0 flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1 py-3 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !quantity || parseFloat(quantity) <= 0}
            className="btn-primary flex-1 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Save Activity
                {estimatedCo2 > 0 && (
                  <span className="text-xs opacity-70">({estimatedCo2} kg)</span>
                )}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}