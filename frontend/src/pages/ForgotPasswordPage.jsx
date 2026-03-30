import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import axios from 'axios';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch (err) {
      const msg = err.response?.data?.error || 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
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
          <p className="text-forest-300 mt-1 text-sm">Reset your password</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-forest-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-forest-400" />
              </div>
              <h2 className="font-display text-xl font-semibold text-white">Check your inbox</h2>
              <p className="text-forest-300 text-sm leading-relaxed">
                If <span className="text-white font-medium">{email}</span> is registered with CarbonTrace, you'll receive a password reset link within a few minutes.
              </p>
              <p className="text-forest-500 text-xs">Check your spam folder if you don't see it.</p>
              <Link to="/login"
                className="inline-flex items-center gap-2 text-forest-300 hover:text-white text-sm font-medium transition-colors mt-2">
                <ArrowLeft size={14} /> Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-forest-500/20 rounded-xl flex items-center justify-center shrink-0">
                  <Mail size={18} className="text-forest-400" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-semibold text-white">Forgot password?</h2>
                  <p className="text-xs text-forest-400">Enter your email and we'll send a reset link</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-400/30 text-red-300 text-sm rounded-xl px-4 py-3 mb-5">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-forest-300 mb-1.5 uppercase tracking-wide">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/10 text-white
                               placeholder:text-forest-400 focus:outline-none focus:ring-2 focus:ring-forest-400
                               focus:border-transparent text-sm"
                    style={{ color: 'white', WebkitTextFillColor: 'white', caretColor: 'white' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full bg-forest-500 hover:bg-forest-400 disabled:opacity-50 text-white font-medium
                             py-2.5 rounded-xl transition-all duration-200 active:scale-95">
                  {loading ? 'Sending…' : 'Send Reset Link'}
                </button>
              </form>

              <p className="text-center text-sm text-forest-400 mt-6">
                Remembered it?{' '}
                <Link to="/login" className="text-forest-300 hover:text-white font-medium transition-colors">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
