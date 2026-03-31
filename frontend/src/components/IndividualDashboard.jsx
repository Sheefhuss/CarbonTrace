import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Leaf, Plus, Trophy, Target, Zap, TrendingDown, TrendingUp,
  Users, MessageCircle, Send, X, ChevronRight, Star, Award,
  BarChart2, Flame, RefreshCw
} from 'lucide-react';
import { AvatarDisplay, AvatarPickerModal } from './AvatarComponents';
import useAuthStore from '../context/authStore';
import { useAITips } from '../hooks/useData';
import {
  formatCO2, fmtDate, COUNTRY_AVERAGES, getDailyFact,
  computeBadges, CHALLENGES, getCurrentWeekKey, detectUserLocation
} from '../utils/helpers';
import axios from 'axios';
import clsx from 'clsx';
function CoinToast({ points, visible, onDone }) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onDone, 2200);
      return () => clearTimeout(t);
    }
  }, [visible, onDone]);

  if (!visible) return null;
  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[999] pointer-events-none">
      <div className="flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl border border-amber-400/40
                      bg-gradient-to-r from-amber-500 to-yellow-400
                      animate-[coinPop_2.2s_ease-out_forwards]">
        <span className="text-2xl animate-[coinSpin_0.4s_ease-in-out_infinite]">🪙</span>
        <div>
          <p className="text-amber-950 font-black text-lg leading-none">+{points} pts</p>
          <p className="text-amber-900 text-xs font-semibold">Points earned!</p>
        </div>
      </div>
    </div>
  );
}

// ── Leaderboard bar chart ────────────────────────────────────────────────────
function LeaderboardBar({ data, currentUserId }) {
  const top = data.slice(0, 8);
  const maxScore = Math.max(...top.map(u => u.score), 1);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-2.5">
      {top.map((user, i) => {
        const pct = Math.round((user.score / maxScore) * 100);
        const isMe = user.id === currentUserId || user.isYou;
        return (
          <div key={user.id} className={clsx(
            'relative rounded-xl overflow-hidden',
            isMe ? 'ring-2 ring-forest-400' : ''
          )}>
            {/* Background bar */}
            <div className="absolute inset-0 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <div
              className="absolute inset-y-0 left-0 rounded-xl transition-all duration-700"
              style={{
                width: `${pct}%`,
                background: isMe
                  ? 'linear-gradient(90deg, rgba(64,146,109,0.5), rgba(100,177,140,0.3))'
                  : 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
              }}
            />
            {/* Content */}
            <div className="relative flex items-center gap-3 px-3 py-2.5">
              <span className="text-lg w-6 text-center shrink-0">
                {medals[i] || <span className="text-forest-500 font-bold text-sm">{i + 1}</span>}
              </span>
              <AvatarDisplay index={user.avatarIndex ?? 0} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-semibold truncate', isMe ? 'text-forest-300' : 'text-white')}>
                  {isMe ? 'You' : user.name}
                  {isMe && <span className="ml-1.5 text-xs bg-forest-500/20 text-forest-400 px-1.5 py-0.5 rounded-full">you</span>}
                </p>
                <p className="text-xs text-forest-500">
                  🔥{user.streakDays}d · {user.activityCount} logs
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-white">{user.score}</p>
                <p className="text-xs text-forest-500">{user.points} pts</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Friend Chat Modal ────────────────────────────────────────────────────────
function FriendChatModal({ friend, currentUser, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    axios.get(`/api/users/messages/${friend.id}`)
      .then(r => setMessages(r.data))
      .catch(() => {});
  }, [friend.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/users/messages/${friend.id}`, { text });
      setMessages(prev => [...prev, res.data]);
      setInput('');
    } catch {}
    setSending(false);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-forest-900 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[70vh] sm:h-[520px]">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
          <AvatarDisplay index={friend.avatarIndex ?? 0} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white">{friend.name}</p>
            <p className="text-xs text-forest-400">@{friend.username} · 🔥{friend.streakDays}d streak</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-white/10 text-forest-400 hover:text-white flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-forest-500 text-sm mt-8">
              <span className="text-2xl block mb-2">🌿</span>
              Start a conversation with {friend.name.split(' ')[0]}!<br />
              <span className="text-xs">Messages are synced in real time.</span>
            </div>
          )}
          {messages.map(msg => {
            const isMe = msg.senderId === currentUser.id;
            const time = new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            return (
              <div key={msg.id} className={clsx('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                {!isMe && <AvatarDisplay index={friend.avatarIndex ?? 0} size="sm" />}
                <div className={clsx(
                  'max-w-[75%] px-3 py-2 rounded-2xl text-sm',
                  isMe ? 'bg-forest-500 text-white rounded-tr-sm' : 'bg-white/8 text-forest-100 border border-white/5 rounded-tl-sm'
                )}>
                  <p>{msg.text}</p>
                  <p className={clsx('text-xs mt-1', isMe ? 'text-forest-200' : 'text-forest-500')}>{time}</p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              rows={1}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={`Message ${friend.name.split(' ')[0]}…`}
              className="flex-1 resize-none bg-white/8 border border-white/10 rounded-xl px-3 py-2
                         text-sm text-white placeholder:text-forest-500 focus:outline-none
                         focus:ring-2 focus:ring-forest-400 focus:border-transparent max-h-24"
              style={{ color: 'white', WebkitTextFillColor: 'white' }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || sending}
              className="w-9 h-9 rounded-xl bg-forest-500 hover:bg-forest-400 disabled:opacity-40
                         flex items-center justify-center transition-all active:scale-95 shrink-0">
              <Send size={14} className="text-white" />
            </button>
          </div>
          <p className="text-xs text-forest-600 text-center mt-1">Messages saved locally on your device</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────────────
// FIX: emissions, emissionsLoading, refetch are now passed from DashboardPage
// so there is a single useEmissions instance — avoids stale data after logging
export default function IndividualDashboard({ setShowLogModal, emissions, emissionsLoading, refetch }) {
  const { user, updateUser } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [friends, setFriends] = useState([]);
  const [friendCode, setFriendCode] = useState('');
  const [addingFriend, setAddingFriend] = useState(false);
  const [friendMsg, setFriendMsg] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [coinToast, setCoinToast] = useState({ visible: false, points: 0 });
  const [location, setLocation] = useState(null);
  const [chatFriend, setChatFriend] = useState(null);
  const [prevPoints, setPrevPoints] = useState(user?.points || 0);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  const { tips, loading: tipsLoading, generateTips } = useAITips(emissions, user, location);

  const dailyFact = getDailyFact();
  const badges = computeBadges(user, emissions);

  // Detect location once
  useEffect(() => {
    detectUserLocation().then(loc => { if (loc) setLocation(loc); });
  }, []);

  // Generate AI tips when emissions load
  useEffect(() => {
    if (emissions.length > 0 && !tips) generateTips();
  }, [emissions.length, tips, generateTips]);

  // Load leaderboard
  useEffect(() => {
    axios.get('/api/dashboard/leaderboard')
      .then(r => setLeaderboard(r.data.leaderboard || []))
      .catch(() => {});
  }, []);

  // Load friends
  useEffect(() => {
    axios.get('/api/users/friends')
      .then(r => setFriends(r.data || []))
      .catch(() => {});
  }, [user?.id]);

  // Coin toast when points change
  useEffect(() => {
    if (user?.points && user.points > prevPoints && prevPoints > 0) {
      const diff = user.points - prevPoints;
      setCoinToast({ visible: true, points: diff });
    }
    if (user?.points) setPrevPoints(user.points);
  }, [user?.points]);

  // Award badges automatically
  useEffect(() => {
    if (!emissions.length) return;
    const allBadges = computeBadges(user, emissions);
    allBadges.forEach(async (b) => {
      if (b.earned && !user?.earnedBadges?.includes(b.id)) {
        try {
          const res = await axios.post('/api/users/award-badge', { badgeId: b.id });
          if (res.data.earned) updateUser({ points: res.data.totalPoints, earnedBadges: res.data.badges });
        } catch {}
      }
    });
  }, [emissions.length]);

  // Monthly stats
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthlyEmissions = emissions.filter(e => e.date >= startOfMonth);
  const monthlyKg = monthlyEmissions.reduce((s, e) => s + parseFloat(e.co2eKg || 0), 0);
  const countryAvg = COUNTRY_AVERAGES[user?.country || 'WORLD']?.kgPerMonth || 400;

  // Challenge progress
  const weekKey = getCurrentWeekKey();
  const challenges = CHALLENGES.map(c => {
    const progress = c.check(emissions, user);
    const pct = Math.min(Math.round((progress / c.target) * 100), 100);
    const weekChallengeKey = `${c.id}_${weekKey}`;
    const completed = user?.completedChallenges?.includes(weekChallengeKey) || pct >= 100;
    return { ...c, progress, pct, completed, weekChallengeKey };
  });

  const handleCompleteChallenge = async (challenge) => {
    if (challenge.completed) return;
    if (challenge.pct < 100) return;
    try {
      const res = await axios.post('/api/users/complete-challenge', { challengeId: challenge.id });
      if (res.data.completed) {
        updateUser({ points: res.data.totalPoints });
        setCoinToast({ visible: true, points: res.data.pointsAwarded });
        // Refresh user
        const me = await axios.get('/api/auth/me');
        updateUser(me.data.user);
      }
    } catch {}
  };

  const handleAddFriend = async (e) => {
    e.preventDefault();
    setAddingFriend(true);
    setFriendMsg('');
    try {
      const res = await axios.post('/api/users/connect-friend', { friendCode });
      setFriendMsg(`✅ ${res.data.message}`);
      setFriendCode('');
      const updated = await axios.get('/api/users/friends');
      setFriends(updated.data || []);
    } catch (err) {
      setFriendMsg(`❌ ${err.response?.data?.error || 'Could not add friend'}`);
    } finally {
      setAddingFriend(false);
    }
  };

  const locationLabel = location?.city
    ? `${location.city}${location.state ? ', ' + location.state : ''}`
    : COUNTRY_AVERAGES[user?.country]?.name || 'Your area';

  const tabs = ['overview', 'challenges', 'leaderboard', 'friends', 'badges'];

  return (
    <>
      {/* Coin Toast */}
      <CoinToast
        points={coinToast.points}
        visible={coinToast.visible}
        onDone={() => setCoinToast(v => ({ ...v, visible: false }))}
      />

      {/* Friend Chat Modal */}
      {chatFriend && (
        <FriendChatModal
          friend={chatFriend}
          currentUser={user}
          onClose={() => setChatFriend(null)}
        />
      )}

      {/* Avatar Picker Modal */}
      {showAvatarModal && (
        <AvatarPickerModal
          current={user?.avatarIndex}
          onClose={() => setShowAvatarModal(false)}
          onSave={async (newIndex) => {
            try {
              updateUser({ avatarIndex: newIndex });
              setShowAvatarModal(false);
              await axios.put('/api/auth/profile', { avatarIndex: newIndex });
            } catch (err) {
              console.error("Failed to save avatar", err);
            }
          }}
        />
      )}

      <div className="space-y-6 pb-24">

        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowAvatarModal(true)} 
              className="relative group rounded-xl overflow-hidden hover:ring-2 hover:ring-forest-400 transition-all cursor-pointer"
              title="Change Avatar"
            >
              <AvatarDisplay index={user?.avatarIndex ?? 0} size="lg" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-xs font-bold">Edit</span>
              </div>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">
                Hi, {user?.name?.split(' ')[0]} 👋
              </h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {user?.streakDays > 0 && (
                  <span className="flex items-center gap-1 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    🔥 {user.streakDays}d streak
                  </span>
                )}
                <span className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm shadow-amber-500/20">
                  ⭐ {user?.points || 0} pts
                </span>
                {user?.weeklyPoints > 0 && (
                  <span className="flex items-center gap-1 bg-purple-500/20 border border-purple-400/30 text-purple-300 text-xs font-bold px-2 py-0.5 rounded-full">
                    🏅 {user.weeklyPoints} this week
                  </span>
                )}
                {location?.city && (
                  <span className="text-xs text-forest-500">📍 {location.city}</span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowLogModal(true)}
            className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5">
            <Plus size={16} /> Log
          </button>
        </div>

        {/* ── This month card ────────────────────────────────────────────────── */}
        <div className="card bg-gradient-to-br from-forest-800/60 to-forest-900/80">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-forest-400 uppercase tracking-widest">This month · {locationLabel}</p>
              <p className="text-3xl font-bold text-white mt-1">{formatCO2(monthlyKg)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-forest-500">vs local avg</p>
              {monthlyKg > 0 ? (
                <p className={clsx(
                  'text-lg font-bold',
                  monthlyKg < countryAvg ? 'text-forest-400' : 'text-amber-400'
                )}>
                  {monthlyKg < countryAvg
                    ? `↓ ${Math.round(((countryAvg - monthlyKg) / countryAvg) * 100)}% below`
                    : `↑ ${Math.round(((monthlyKg - countryAvg) / countryAvg) * 100)}% above`}
                </p>
              ) : (
                <p className="text-sm text-forest-500">Log to compare</p>
              )}
              <p className="text-xs text-forest-600">avg: {formatCO2(countryAvg)}/mo</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-forest-950/60 rounded-full overflow-hidden">
            <div
              className={clsx(
                'h-full rounded-full transition-all duration-700',
                monthlyKg < countryAvg ? 'bg-forest-400' : 'bg-amber-400'
              )}
              style={{ width: `${Math.min((monthlyKg / (countryAvg * 1.5)) * 100, 100)}%` }}
            />
          </div>
          <p className="text-xs text-forest-500 mt-2">
            🌱 Tip: {dailyFact.emoji} {dailyFact.fact}
          </p>
        </div>

        {/* ── Tab nav ─────────────────────────────────────────────────────────── */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button key={t} onClick={() => setActiveTab(t)}
              className={clsx(
                'flex-1 py-2 px-2 rounded-lg text-xs font-semibold capitalize transition-all whitespace-nowrap',
                activeTab === t
                  ? 'bg-forest-500 text-white shadow'
                  : 'text-forest-400 hover:text-white'
              )}>
              {t}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* By category */}
            {monthlyEmissions.length > 0 && (() => {
              const bycat = {};
              monthlyEmissions.forEach(e => {
                bycat[e.category] = (bycat[e.category] || 0) + parseFloat(e.co2eKg || 0);
              });
              const sorted = Object.entries(bycat).sort(([,a],[,b]) => b - a);
              const total = sorted.reduce((s,[,v]) => s+v, 0);
              const catColors = { transport:'#40926d', food:'#64b18c', shopping:'#97ceb1', housing:'#f59e0b', industrial:'#ef4444', other:'#6b7280' };
              return (
                <div className="card">
                  <h3 className="text-sm font-bold text-white mb-3">Emissions by Category</h3>
                  <div className="space-y-2">
                    {sorted.map(([cat, kg]) => (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="capitalize text-forest-200 font-medium">{cat}</span>
                          <span className="text-forest-400">{formatCO2(kg)}</span>
                        </div>
                        <div className="h-2 bg-forest-950/60 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.round((kg/total)*100)}%`, backgroundColor: catColors[cat] || '#6b7280' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* AI Tips */}
            <div className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>🤖</span> Personalised Tips
                </h3>
                {tipsLoading && <div className="w-4 h-4 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />}
              </div>
              {(tips || FALLBACK_TIPS_STATIC).map((tip, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/5 mb-2 last:mb-0">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{tip.title}</p>
                    <p className="text-xs text-forest-300 mt-0.5">{tip.desc}</p>
                    <p className="text-xs text-forest-500 mt-1 font-medium">{tip.saving}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Recent logs */}
            {emissions.slice(0, 5).length > 0 && (
              <div className="card">
                <h3 className="text-sm font-bold text-white mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {emissions.slice(0, 5).map(e => (
                    <div key={e.id} className="flex items-center justify-between py-1.5 border-b border-white/5 last:border-0">
                      <div>
                        <p className="text-sm text-white capitalize">{e.subCategory || e.category}</p>
                        <p className="text-xs text-forest-500">{fmtDate(e.date)} · {e.quantity} {e.unit}</p>
                      </div>
                      <span className={clsx(
                        'text-sm font-bold',
                        parseFloat(e.co2eKg) <= 2 ? 'text-forest-400' : 'text-white'
                      )}>
                        {formatCO2(parseFloat(e.co2eKg))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* CHALLENGES TAB */}
        {activeTab === 'challenges' && (
          <div className="space-y-3">
            <p className="text-xs text-forest-500 text-center">Weekly challenges reset every Monday</p>
            {challenges.filter(c => !c.completed).map(c => (
              <div key={c.id} className={clsx(
                'card border-2 transition-all',
                c.completed ? 'border-forest-400/40 bg-forest-500/10' : 'border-white/5'
              )}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{c.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      {c.completed && <span className="text-xs bg-forest-500/20 text-forest-400 px-2 py-0.5 rounded-full">✓ Done</span>}
                    </div>
                    <p className="text-xs text-forest-400 mt-0.5">{c.desc}</p>
                    <div className="mt-2">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-forest-500">{c.progress} / {c.target} {c.unit}</span>
                        <span className="text-amber-400 font-bold">+{c.points} pts</span>
                      </div>
                      <div className="h-2 bg-forest-950/60 rounded-full overflow-hidden">
                        <div
                          className={clsx('h-full rounded-full transition-all duration-500', c.completed ? 'bg-forest-400' : 'bg-forest-600')}
                          style={{ width: `${c.pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {c.pct >= 100 && !c.completed && (
                  <button
                    onClick={() => handleCompleteChallenge(c)}
                    className="mt-3 w-full btn-primary py-2 text-sm flex items-center justify-center gap-2">
                    🪙 Claim {c.points} pts
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* LEADERBOARD TAB */}
        {activeTab === 'leaderboard' && (
          <div className="space-y-4">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Trophy size={16} className="text-amber-400" /> Global Leaderboard
                </h3>
                <p className="text-xs text-forest-500">Score = activity + streak + badges</p>
              </div>
              {leaderboard.length > 0 ? (
                <LeaderboardBar data={leaderboard} currentUserId={user?.id} />
              ) : (
                <p className="text-center text-forest-500 text-sm py-4">Loading…</p>
              )}
            </div>
            {leaderboard.find(u => u.isYou) && (
              <div className="card bg-forest-500/10 border border-forest-400/20 text-center">
                <p className="text-forest-300 text-sm">
                  Your rank: <span className="text-white font-bold">#{leaderboard.find(u => u.isYou)?.rank}</span>
                  {' '}out of {leaderboard.length} players
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* FRIENDS TAB */}
        {activeTab === 'friends' && (
          <div className="space-y-4">
            {/* Your code */}
            <div className="card text-center">
              <p className="text-xs text-forest-400 uppercase tracking-widest mb-2">Your Friend Code</p>
              <p className="text-3xl font-black text-white tracking-[0.2em] font-mono">
                {user?.friendCode || '—'}
              </p>
              <p className="text-xs text-forest-500 mt-2">Share this code so friends can add you</p>
            </div>

            {/* Add friend */}
            <div className="card">
              <h3 className="text-sm font-bold text-white mb-3">Add a Friend</h3>
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <input
                  value={friendCode}
                  onChange={e => setFriendCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                  placeholder="Enter 8-char code"
                  maxLength={8}
                  className="input flex-1 font-mono tracking-widest text-sm"
                  style={{ color: 'white', WebkitTextFillColor: 'white' }}
                />
                <button
                  type="submit"
                  disabled={addingFriend || friendCode.length !== 8}
                  className="btn-primary text-sm px-4 disabled:opacity-40">
                  {addingFriend ? '…' : 'Add'}
                </button>
              </form>
              {friendMsg && (
                <p className={clsx('text-xs mt-2', friendMsg.startsWith('✅') ? 'text-forest-400' : 'text-red-400')}>
                  {friendMsg}
                </p>
              )}
            </div>

            {/* Friend list */}
            {friends.length > 0 ? (
              <div className="card">
                <h3 className="text-sm font-bold text-white mb-3">Friends ({friends.length})</h3>
                <div className="space-y-3">
                  {friends.map(f => (
                    <div key={f.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/8 transition-all">
                      <AvatarDisplay index={f.avatarIndex ?? 0} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-white">{f.name}</p>
                        <p className="text-xs text-forest-400">
                          🔥{f.streakDays}d · ⭐{f.points}pts
                          {f.monthKg > 0 && ` · ${formatCO2(f.monthKg)} this month`}
                        </p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {(f.earnedBadges || []).slice(0, 4).map((bid, i) => (
                            <span key={i} className="text-sm">{getBadgeIcon(bid)}</span>
                          ))}
                        </div>
                      </div>
                      <button
                        onClick={() => setChatFriend(f)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-forest-500/20 hover:bg-forest-500/30 text-forest-300 text-xs font-semibold transition-all">
                        <MessageCircle size={13} />
                        Chat
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="card text-center py-8">
                <Users size={32} className="text-forest-600 mx-auto mb-3" />
                <p className="text-forest-400 text-sm">No friends yet</p>
                <p className="text-forest-600 text-xs mt-1">Share your friend code to connect!</p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* BADGES TAB */}
        {activeTab === 'badges' && (
          <div className="card">
            <h3 className="text-sm font-bold text-white mb-4">Achievements</h3>
            <div className="grid grid-cols-3 gap-3">
              {badges.map(b => (
                <div key={b.id} className={clsx(
                  'flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-center transition-all',
                  b.earned
                    ? 'border-forest-400/40 bg-forest-500/15'
                    : 'border-white/5 bg-white/3 opacity-40 grayscale'
                )}>
                  <span className="text-2xl">{b.icon}</span>
                  <p className={clsx('text-xs font-bold leading-tight', b.earned ? 'text-white' : 'text-forest-500')}>
                    {b.name}
                  </p>
                  <p className="text-xs text-forest-500 leading-tight">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </>
  );
}

// Static fallback used before hook resolves
const FALLBACK_TIPS_STATIC = [
  { icon: '🚗', title: 'Reduce short car trips', desc: 'Walk or cycle for trips under 2 km.', saving: 'Save ~200 kg/year' },
  { icon: '🥗', title: 'Try meat-free days', desc: 'Cutting meat twice a week makes a big difference.', saving: 'Save ~150 kg/year' },
  { icon: '💡', title: 'Switch to LED lighting', desc: 'LEDs use 75% less energy than old bulbs.', saving: 'Save ~80 kg/year' },
];

const BADGE_MAP = {
  first_log:'🌱', week_streak:'🔥', month_streak:'⚡', ten_logs:'📊',
  fifty_logs:'🏆', below_avg:'🌍', offset_1t:'🌲', quiz_done:'📝',
  veg_week:'🥗', no_car:'🚶', century:'💯', friend_made:'🤝',
};
const getBadgeIcon = (id) => BADGE_MAP[id] || '🏅';
