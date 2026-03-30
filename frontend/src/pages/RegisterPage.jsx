import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, ChevronLeft, ChevronRight, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../context/authStore';
import { AVATARS, AvatarDisplay, AvatarButton } from '../components/AvatarComponents';

const COUNTRIES = [
  { code: 'IND', label: 'India' },
  { code: 'USA', label: 'United States' },
  { code: 'GBR', label: 'United Kingdom' },
  { code: 'DEU', label: 'Germany' },
  { code: 'FRA', label: 'France' },
  { code: 'AUS', label: 'Australia' },
  { code: 'CAN', label: 'Canada' },
  { code: 'BRA', label: 'Brazil' },
  { code: 'CHN', label: 'China' },
  { code: 'WORLD', label: 'Other' },
];

const inputStyle = {
  color: 'white',
  WebkitTextFillColor: 'white',
  backgroundColor: 'rgba(255,255,255,0.08)',
  caretColor: 'white',
};

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    username: '', avatarIndex: 0,
    role: 'individual', country: 'IND',
  });
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [error, setError] = useState('');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleStep1 = (e) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) { setError('Please enter your full name.'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(form.password)) { setError('Password needs at least one uppercase letter.'); return; }
    if (!/[0-9]/.test(form.password)) { setError('Password needs at least one number.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match.'); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const { confirmPassword, ...submitData } = form;
    const result = await register(submitData);
    if (result.ok) navigate('/quiz');
    else setError(result.error);
  };

  const sharedInputClass = "w-full px-4 py-3 rounded-xl border border-white/10 placeholder:text-forest-500 focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent text-sm";

  const pwChecks = [
    { ok: form.password.length >= 8, label: '8+ chars' },
    { ok: /[A-Z]/.test(form.password), label: 'Uppercase' },
    { ok: /[0-9]/.test(form.password), label: 'Number' },
    { ok: form.password === form.confirmPassword && form.confirmPassword.length > 0, label: 'Passwords match' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-forest-600/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-forest-400/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-forest-500 rounded-2xl mb-4 shadow-lg">
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">CarbonTrace</h1>
          <p className="text-forest-300 mt-1 text-sm">Start your journey to net zero</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-semibold text-white">
              {step === 1 ? 'Create account' : 'Personalise your profile'}
            </h2>
            <div className="flex gap-1.5">
              {[1, 2].map(s => (
                <div key={s} className={`w-2 h-2 rounded-full transition-all ${step >= s ? 'bg-forest-400' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleStep1} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">Full Name</label>
                <input
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="Your full name"
                  required
                  className={sharedInputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="you@example.com"
                  required
                  className={sharedInputClass}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => set('password', e.target.value)}
                    placeholder="8+ chars, 1 uppercase, 1 number"
                    required
                    className={sharedInputClass + ' pr-10'}
                    style={{ ...inputStyle, WebkitTextFillColor: 'white' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400 hover:text-white">
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={form.confirmPassword}
                    onChange={e => set('confirmPassword', e.target.value)}
                    placeholder="Re-enter your password"
                    required
                    className={sharedInputClass + ' pr-10'}
                    style={{ ...inputStyle, WebkitTextFillColor: 'white' }}
                  />
                  <button type="button" onClick={() => setShowConfirmPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400 hover:text-white">
                    {showConfirmPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {form.password.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pwChecks.map((r, i) => (
                      <span key={i} className={`text-xs px-2 py-0.5 rounded-full ${r.ok ? 'bg-forest-500/20 text-forest-300' : 'bg-white/5 text-forest-600'}`}>
                        {r.ok ? '✓' : '○'} {r.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">Country</label>
                <select value={form.country} onChange={e => set('country', e.target.value)}
                  className={sharedInputClass} style={inputStyle}>
                  {COUNTRIES.map(c => (
                    <option key={c.code} value={c.code} className="bg-forest-900">{c.label}</option>
                  ))}
                </select>
              </div>
              <button type="submit"
                className="w-full bg-forest-500 hover:bg-forest-400 text-white font-medium py-3 rounded-xl transition-all duration-200 active:scale-95 flex items-center justify-center gap-2">
                Next <ChevronRight size={16} />
              </button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-forest-300 mb-1 uppercase tracking-wide">
                  Username <span className="normal-case text-forest-500">(shown publicly, not your email)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-forest-400 text-sm font-medium">@</span>
                  <input
                    value={form.username}
                    onChange={e => set('username', e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20))}
                    placeholder="eco_ravi"
                    className={sharedInputClass + ' pl-8'}
                    style={inputStyle}
                    maxLength={20}
                  />
                </div>
                <p className="text-xs text-forest-500 mt-1">Leave blank to auto-generate · 3-20 chars, letters/numbers/_</p>
              </div>

              <div>
                <label className="block text-xs font-medium text-forest-300 mb-3 uppercase tracking-wide">Choose Your Avatar</label>
                <div className="grid grid-cols-5 gap-2">
                  {AVATARS.map((av, i) => (
                    <AvatarButton key={i} av={av} index={i} selected={form.avatarIndex} onSelect={(idx) => set('avatarIndex', idx)} />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <AvatarDisplay index={form.avatarIndex} size="lg" />
                <div>
                  <p className="text-white font-semibold">{form.name || 'Your Name'}</p>
                  <p className="text-xs text-forest-400">@{form.username || 'username'} · {AVATARS[form.avatarIndex]?.label}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="btn-secondary flex-1 flex items-center justify-center gap-1 text-sm py-3">
                  <ChevronLeft size={14} /> Back
                </button>
                <button type="submit" disabled={isLoading}
                  className="flex-1 bg-forest-500 hover:bg-forest-400 disabled:opacity-50 text-white font-medium py-3 rounded-xl transition-all duration-200 active:scale-95 text-sm">
                  {isLoading ? 'Creating…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}

          {step === 1 && (
            <p className="text-center text-sm text-forest-400 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-forest-300 hover:text-white font-medium transition-colors">Sign in</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}