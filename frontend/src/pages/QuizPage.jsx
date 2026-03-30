import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Leaf } from 'lucide-react';
import { useEmissions } from '../hooks/useData';
import { formatCO2, footprintContext } from '../utils/helpers';

const STEPS = [
  {
    id: 'home',
    title: 'Your Home',
    icon: '🏠',
    fields: [
      { key: 'householdSize',          label: 'Household size (people)',      type: 'number', min: 1,   max: 20,   default: 2   },
      { key: 'homeSqm',                label: 'Home size (sqm)',              type: 'number', min: 10,  max: 1000, default: 80  },
      { key: 'electricityKwhPerMonth', label: 'Electricity use (kWh/month)',  type: 'number', min: 0,   max: 5000, default: 200 },
      {
        key: 'heatingType', label: 'Primary heating', type: 'select',
        options: [
          { v: 'gas',       l: 'Natural Gas' },
          { v: 'electric',  l: 'Electric'    },
          { v: 'heat_pump', l: 'Heat Pump'   },
          { v: 'none',      l: 'No Heating'  },
        ],
        default: 'gas',
      },
    ],
  },
  {
    id: 'transport',
    title: 'Getting Around',
    icon: '🚗',
    fields: [
      {
        key: 'carType', label: 'Primary vehicle', type: 'select',
        options: [
          { v: 'petrol',   l: 'Petrol / CNG' },
          { v: 'diesel',   l: 'Diesel'        },
          { v: 'hybrid',   l: 'Hybrid'        },
          { v: 'electric', l: 'Electric'      },
          { v: 'none',     l: 'No car'        },
        ],
        default: 'petrol',
      },
      { key: 'kmPerWeek',      label: 'Km driven per week',            type: 'number', min: 0,   max: 5000, default: 100 },
      { key: 'flightsPerYear', label: 'Flights per year (return)',     type: 'number', min: 0,   max: 100,  default: 2   },
      { key: 'avgFlightHours', label: 'Average flight duration (hrs)', type: 'number', min: 0.5, max: 24,   default: 3   },
    ],
  },
  {
    id: 'food',
    title: 'Food & Diet',
    icon: '🍽️',
    fields: [
      { key: 'meatDaysPerWeek',       label: 'Days per week eating meat',       type: 'range',  min: 0, max: 7,     default: 4   },
      { key: 'shoppingBudgetMonthly', label: 'Monthly shopping budget (USD)',   type: 'number', min: 0, max: 10000, default: 200 },
    ],
  },
];

const inputStyle = {
  color: 'white',
  WebkitTextFillColor: 'white',
  backgroundColor: 'rgba(255,255,255,0.08)',
  caretColor: 'white',
};

export default function QuizPage() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState(() =>
    STEPS.flatMap(s => s.fields).reduce((acc, f) => ({ ...acc, [f.key]: f.default }), {})
  );
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { runQuiz } = useEmissions();
  const navigate = useNavigate();

  const set = (k, v) => setAnswers(p => ({ ...p, [k]: v }));

  const handleNext = async () => {
    if (step < STEPS.length - 1) {
      setStep(s => s + 1);
      return;
    }
    setLoading(true);
    const data = await runQuiz(answers);
    setLoading(false);
    if (data) setResult(data);
  };

  if (result) {
    const ctx = footprintContext(result.totalKgPerYear);
    const breakdown = result.breakdown || {};
    return (
      <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🌍</div>
            <h2 className="font-display text-2xl font-semibold text-white">Your Baseline Footprint</h2>
            <p className="text-sm text-forest-400 mt-1">Estimated annual CO₂e</p>
          </div>

          <div className="text-center bg-forest-500/10 border border-forest-400/20 rounded-xl py-6 mb-6">
            <p className="text-4xl font-display font-bold text-white">{formatCO2(result.totalKgPerYear)}</p>
            <p className="text-sm mt-2 font-medium" style={{ color: ctx.color }}>{ctx.label}</p>
          </div>

          <div className="space-y-3 mb-6">
            {Object.entries(breakdown).map(([cat, kg]) => {
              const pct = Math.round((kg / result.totalKgPerYear) * 100);
              return (
                <div key={cat}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize font-medium text-forest-200">{cat}</span>
                    <span className="text-forest-400 font-mono">{formatCO2(kg)}</span>
                  </div>
                  <div className="h-2 bg-forest-950/80 rounded-full overflow-hidden">
                    <div className="h-full bg-forest-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <button onClick={() => navigate('/dashboard')}
            className="w-full bg-forest-500 hover:bg-forest-400 text-white font-medium py-3 rounded-xl
                       transition-all active:scale-95 flex items-center justify-center gap-2">
            Go to Dashboard <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-forest-500 rounded-2xl mb-3 shadow-lg">
            <Leaf size={24} className="text-white" />
          </div>
          <h1 className="font-display text-2xl text-white">Quick Footprint Quiz</h1>
          <p className="text-forest-400 text-sm mt-1">Step {step + 1} of {STEPS.length}</p>
        </div>

        <div className="h-1.5 bg-white/10 rounded-full mb-6">
          <div className="h-full bg-forest-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{currentStep.icon}</span>
            <h2 className="font-display text-xl font-semibold text-white">{currentStep.title}</h2>
          </div>

          <div className="space-y-5">
            {currentStep.fields.map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">
                  {field.label}
                </label>

                {field.type === 'select' ? (
                  <select
                    value={answers[field.key]}
                    onChange={e => set(field.key, e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm
                               focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent"
                    style={inputStyle}
                  >
                    {field.options.map(o => (
                      <option key={o.v} value={o.v} className="bg-forest-900 text-white">{o.l}</option>
                    ))}
                  </select>

                ) : field.type === 'range' ? (
                  <div>
                    <input
                      type="range"
                      min={field.min}
                      max={field.max}
                      value={answers[field.key]}
                      onChange={e => set(field.key, parseFloat(e.target.value))}
                      className="w-full accent-forest-400"
                    />
                    <div className="flex justify-between text-xs text-forest-500 mt-1">
                      <span>{field.min} days</span>
                      <span className="font-semibold text-forest-300">{answers[field.key]} days</span>
                      <span>{field.max} days</span>
                    </div>
                  </div>

                ) : (
                  <input
                    type="number"
                    min={field.min}
                    max={field.max}
                    value={answers[field.key]}
                    onChange={e => set(field.key, parseFloat(e.target.value))}
                    className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm
                               focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent"
                    style={inputStyle}
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-8">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl border border-white/10
                           text-forest-300 hover:bg-white/5 text-sm font-medium transition-all">
                <ChevronLeft size={15} /> Back
              </button>
            )}
            <button onClick={handleNext} disabled={loading}
              className="flex-1 bg-forest-500 hover:bg-forest-400 disabled:opacity-50 text-white font-medium
                         py-2.5 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Calculating…
                </>
              ) : (
                <>
                  {step < STEPS.length - 1 ? 'Next' : 'Calculate My Footprint'}
                  <ChevronRight size={15} />
                </>
              )}
            </button>
          </div>
        </div>

        <button onClick={() => navigate('/dashboard')}
          className="block text-center text-forest-500 hover:text-forest-300 text-sm mt-4 mx-auto transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}