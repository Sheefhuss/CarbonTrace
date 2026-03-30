import React, { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Leaf, Eye, EyeOff, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const pwChecks = [
    { ok: form.password.length >= 8, label: '8+ chars' },
    { ok: /[A-Z]/.test(form.password), label: 'Uppercase' },
    { ok: /[0-9]/.test(form.password), label: 'Number' },
    { ok: form.password === form.confirmPassword && form.confirmPassword.length > 0, label: 'Match' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!pwChecks.every(c => c.ok)) { setError('Please meet all password requirements.'); return; }
    setLoading(true);
    try {
      await axios.post('/api/auth/reset-password', { token, password: form.password });
      setDone(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-red-400">Invalid reset link.</p>
          <Link to="/forgot-password" className="text-forest-300 mt-2 block">Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-forest-950 via-forest-900 to-forest-800 flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-forest-500 rounded-2xl mb-4 shadow-lg">
            <Leaf size={28} className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">CarbonTrace</h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {done ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-forest-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-forest-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Password reset!</h2>
              <p className="text-forest-300 text-sm">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="font-display text-xl font-semibold text-white mb-6">Set new password</h2>
              {error && (
                <div className="bg-red-500/10 border border-red-400/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">New Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                      placeholder="8+ chars, 1 uppercase, 1 number"
                      required
                      className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/10 border border-white/10 text-white
                                 placeholder:text-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-400 text-sm"
                      style={{ color: 'white', WebkitTextFillColor: 'white', caretColor: 'white' }}
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400 hover:text-white">
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">Confirm Password</label>
                  <input
                    type="password"
                    value={form.confirmPassword}
                    onChange={e => setForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Re-enter password"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white
                               placeholder:text-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-400 text-sm"
                    style={{ color: 'white', WebkitTextFillColor: 'white', caretColor: 'white' }}
                  />
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
                <button type="submit" disabled={loading}
                  className="w-full bg-forest-500 hover:bg-forest-400 disabled:opacity-50 text-white font-medium py-2.5 rounded-xl transition-all active:scale-95">
                  {loading ? 'Resetting…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
