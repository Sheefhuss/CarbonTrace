import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Leaf, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../context/authStore';

export default function LoginPage() {
  const [form, setForm] = useState({ identifier: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const result = await login(form.identifier, form.password);
    if (result.ok) navigate('/dashboard');
    else setError(result.error);
  };

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
          <p className="text-forest-300 mt-1 text-sm">Track. Reduce. Offset.</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="font-display text-xl font-semibold text-white mb-6">Sign in</h2>

          {error && (
            <div className="bg-red-500/10 border border-red-400/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">
                Email or Username
              </label>
              <input
                type="text"
                value={form.identifier}
                onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
                placeholder="you@example.com or @username"
                required
                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white
                           placeholder:text-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-400
                           focus:border-transparent text-sm"
              />
              <p className="text-xs text-forest-500 mt-1">You can sign in with your email or your @username</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-forest-300 uppercase tracking-wide">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs text-forest-400 hover:text-forest-300 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white/10 border border-white/10 text-white
                             placeholder:text-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-400
                             focus:border-transparent text-sm"
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-forest-400 hover:text-white">
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-forest-500 hover:bg-forest-400 disabled:opacity-50 text-white font-medium
                         py-2.5 rounded-xl transition-all duration-200 active:scale-95 mt-2"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-forest-400 mt-6">
            No account?{' '}
            <Link to="/register" className="text-forest-300 hover:text-white font-medium transition-colors">
              Create one free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}