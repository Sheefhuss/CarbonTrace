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
import socket from '../socket';

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
      <div className="flex items-center gap-2 px-5 py-3 rounded-2xl shadow-2xl border border-amber-400/40 bg-gradient-to-r from-amber-500 to-yellow-400 animate-[coinPop_2.2s_ease-out_forwards]">
        <span className="text-2xl animate-[coinSpin_0.4s_ease-in-out_infinite]">🪙</span>
        <div>
          <p className="text-amber-950 font-black text-lg leading-none">+{points} pts</p>
          <p className="text-amber-900 text-xs font-semibold">Points earned!</p>
        </div>
      </div>
    </div>
  );
}

function LeaderboardBar({ data, currentUserId }) {
  const top = data.slice(0, 8);
  const maxScore = Math.max(...top.map(u => u.score), 1);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="space-y-2.5">
      {top.map((user, i) => {
        const pct = Math.round((user.score / maxScore) * 100);
        const isMe = user.id === currentUserId;
        return (
          <div key={user.id} className={clsx('relative rounded-xl overflow-hidden', isMe ? 'ring-2 ring-forest-400' : '')}>
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
            <div className="relative flex items-center gap-3 px-3 py-2.5">
              <span className="text-lg w-6 text-center shrink-0">
                {medals[i] || <span className="text-forest-500 font-bold text-sm">{i + 1}</span>}
              </span>
              <AvatarDisplay index={user.avatarIndex ?? 0} size="sm" />
              <div className="flex-1 min-w-0">
                <p className={clsx('text-sm font-semibold truncate', isMe ? 'text-forest-300' : 'text-white')}>
                  {user.name}
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

function FriendChatModal({ friend, currentUser, onClose, onlineUsers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [deleteMenu, setDeleteMenu] = useState(null);
  const bottomRef = useRef(null);

  const isOnline = onlineUsers[friend.id] || false;

  useEffect(() => {
    axios.get(`/api/users/messages/${friend.id}`).then(r => setMessages(r.data));
  }, [friend.id]);

  useEffect(() => {
    const handleNewMessage = (msg) => {
      if (msg.senderId === friend.id) {
        setMessages(prev => (prev.find(m => m.id === msg.id) ? prev : [...prev, msg]));
      }
    };
    const handleDeletedMessage = (messageId) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };
    socket.on('receive_message', handleNewMessage);
    socket.on('message_deleted', handleDeletedMessage);
    return () => {
      socket.off('receive_message', handleNewMessage);
      socket.off('message_deleted', handleDeletedMessage);
    };
  }, [friend.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    try {
      const res = await axios.post(`/api/users/messages/${friend.id}`, { text: input.trim() });
      setMessages(prev => [...prev, res.data]);
      socket.emit('send_message', res.data);
      setInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleDeleteForEveryone = async (msgId) => {
    try {
      await axios.delete(`/api/users/messages/${msgId}`);
      socket.emit('delete_message', msgId);
    } catch (err) {
      console.error(err);
    }
    setDeleteMenu(null);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDeleteMenu(null)}>
      <div className="w-full sm:max-w-md bg-forest-900 border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col h-[70vh] sm:h-[520px]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0">
          <div className="relative">
            <AvatarDisplay index={friend.avatarIndex ?? 0} size="md" />
            <span className={clsx('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-forest-900', isOnline ? 'bg-green-400' : 'bg-forest-600')} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white">{friend.name}</p>
            <p className="text-xs text-forest-400">{isOnline ? 'Online' : 'Offline'} · @{friend.username}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-white/10 text-forest-400 flex items-center justify-center"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {messages.map((msg) => {
            const isMe = msg.senderId === currentUser.id;
            return (
              <div key={msg.id} className={clsx('flex gap-2', isMe ? 'justify-end' : 'justify-start')}>
                {!isMe && <AvatarDisplay index={friend.avatarIndex ?? 0} size="sm" />}
                <div className="relative max-w-[75%]">
                  <div className={clsx('px-3 py-2 rounded-2xl text-sm cursor-pointer', isMe ? 'bg-forest-500 text-white rounded-tr-sm' : 'bg-white/8 text-forest-100 rounded-tl-sm')} onClick={() => setDeleteMenu(deleteMenu === msg.id ? null : msg.id)}>
                    <p>{msg.text}</p>
                  </div>
                  {deleteMenu === msg.id && isMe && (
                    <div className="absolute z-10 mt-1 right-0 bg-forest-800 border border-white/10 rounded-xl shadow-xl min-w-[160px]">
                      <button onClick={() => handleDeleteForEveryone(msg.id)} className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-all">🗑️ Delete for everyone</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        <div className="p-3 border-t border-white/10 shrink-0">
          <div className="flex gap-2 items-end">
            <textarea rows={1} value={input} onChange={e => setInput(e.target.value)} placeholder={`Message ${friend.name.split(' ')[0]}...`} className="flex-1 bg-white/8 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }}} />
            <button onClick={sendMessage} disabled={!input.trim() || sending} className="w-9 h-9 rounded-xl bg-forest-500 flex items-center justify-center disabled:opacity-40"><Send size={14} className="text-white"/></button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IndividualDashboard({ setShowLogModal, emissions, emissionsLoading, refetch }) {
  const { user, updateUser } = useAuthStore();
  const [leaderboard, setLeaderboard] = useState([]);
  const [friends, setFriends] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [onlineUsers, setOnlineUsers] = useState({});
  const [friendCode, setFriendCode] = useState('');
  const [friendMsg, setFriendMsg] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [coinToast, setCoinToast] = useState({ visible: false, points: 0 });
  const [location, setLocation] = useState(null);
  const [chatFriend, setChatFriend] = useState(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  
  const { tips, loading: tipsLoading, generateTips } = useAITips(emissions, user, location);
  const dailyFact = getDailyFact();
  const badges = computeBadges(user, emissions);

  useEffect(() => {
    detectUserLocation().then(loc => { if (loc) setLocation(loc); });
    axios.get('/api/dashboard/leaderboard').then(r => setLeaderboard(r.data.leaderboard || []));
  }, []);

  useEffect(() => {
    if (emissions.length > 0 && !tips) generateTips();
  }, [emissions.length, tips, generateTips]);

  useEffect(() => {
    if (!user?.id) return;
    const announce = () => socket.emit('user_online', user.id);
    socket.on('connect', announce);
    socket.on('status_update', ({ userId, status }) => setOnlineUsers(p => ({ ...p, [userId]: status === 'online' })));
    socket.on('sync_online_users', (ids) => {
      const statuses = {};
      ids.forEach(id => statuses[id] = true);
      setOnlineUsers(statuses);
    });
    if (socket.connected) announce();
    return () => {
      socket.off('connect', announce);
      socket.off('status_update');
      socket.off('sync_online_users');
    };
  }, [user?.id]);

  useEffect(() => {
    axios.get('/api/users/friends').then(r => setFriends(r.data || []));
    axios.get('/api/users/messages/unread-counts').then(r => setUnreadCounts(r.data || {}));
  }, [user?.id]);

  const handleAddFriend = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post('/api/users/connect-friend', { friendCode });
      setFriendMsg(`✅ ${res.data.message}`);
      setFriendCode('');
      axios.get('/api/users/friends').then(r => setFriends(r.data));
    } catch (err) {
      setFriendMsg(`❌ ${err.response?.data?.error || 'Failed'}`);
    }
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const monthlyKg = emissions.filter(e => e.date >= startOfMonth).reduce((s, e) => s + parseFloat(e.co2eKg || 0), 0);
  const countryAvg = COUNTRY_AVERAGES[user?.country || 'WORLD']?.kgPerMonth || 400;

  return (
    <>
      <CoinToast points={coinToast.points} visible={coinToast.visible} onDone={() => setCoinToast(v => ({ ...v, visible: false }))} />
      {chatFriend && <FriendChatModal friend={chatFriend} currentUser={user} onClose={() => setChatFriend(null)} onlineUsers={onlineUsers} />}
      {showAvatarModal && <AvatarPickerModal current={user?.avatarIndex} onClose={() => setShowAvatarModal(false)} onSave={async (newIndex) => { try { updateUser({ avatarIndex: newIndex }); setShowAvatarModal(false); await axios.put('/api/auth/profile', { avatarIndex: newIndex }); } catch (err) {} }} />}

      <div className="space-y-6 pb-24">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAvatarModal(true)} className="relative group rounded-xl overflow-hidden cursor-pointer">
              <AvatarDisplay index={user?.avatarIndex ?? 0} size="lg" />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold text-white text-xs">Edit</div>
            </button>
            <div>
              <h1 className="text-xl font-bold text-white">Hi, {user?.name?.split(' ')[0]} 👋</h1>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="flex items-center gap-1 bg-orange-500/20 border border-orange-400/30 text-orange-300 text-xs font-bold px-2 py-0.5 rounded-full">🔥 {user?.streakDays || 0}d streak</span>
                <span className="flex items-center gap-1 bg-amber-400/20 border border-amber-400/40 text-amber-300 text-xs font-black px-2.5 py-0.5 rounded-full">⭐ {user?.points || 0} pts</span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowLogModal(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5"><Plus size={16} /> Log</button>
        </div>

        <div className="card bg-gradient-to-br from-forest-800/60 to-forest-900/80 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-forest-400 uppercase tracking-widest">This month</p>
              <p className="text-3xl font-bold text-white mt-1">{formatCO2(monthlyKg)}</p>
            </div>
            <div className="text-right">
              <p className={clsx('text-lg font-bold', monthlyKg < countryAvg ? 'text-forest-400' : 'text-amber-400')}>
                {monthlyKg < countryAvg ? `↓ ${Math.round(((countryAvg - monthlyKg) / countryAvg) * 100)}% below avg` : `↑ ${Math.round(((monthlyKg - countryAvg) / countryAvg) * 100)}% above avg`}
              </p>
            </div>
          </div>
          <div className="h-2 bg-forest-950/60 rounded-full overflow-hidden"><div className="h-full bg-forest-400 transition-all duration-700" style={{ width: `${Math.min((monthlyKg / (countryAvg * 1.5)) * 100, 100)}%` }} /></div>
          <p className="text-xs text-forest-500 mt-2">🌱 Fact: {dailyFact.fact}</p>
        </div>

        <div className="flex gap-1 bg-white/5 p-1 rounded-xl overflow-x-auto">
          {['overview', 'challenges', 'leaderboard', 'friends', 'badges'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} className={clsx('flex-1 py-2 px-4 rounded-lg text-xs font-semibold capitalize transition-all', activeTab === t ? 'bg-forest-500 text-white shadow' : 'text-forest-400 hover:text-white')}>
              {t}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="card p-4">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2"><span>🤖</span> Personalised Tips</h3>
              {tipsLoading && <div className="w-4 h-4 border-2 border-forest-400 border-t-transparent rounded-full animate-spin" />}
              {(tips || []).map((tip, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-xl bg-white/5 mb-2 last:mb-0">
                  <span className="text-xl shrink-0">{tip.icon}</span>
                  <div><p className="text-sm font-semibold text-white">{tip.title}</p><p className="text-xs text-forest-300">{tip.desc}</p></div>
                </div>
              ))}
            </div>
            <div className="card p-4">
              <h3 className="text-sm font-bold text-white mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {emissions.slice(0, 5).map(e => (
                  <div key={e.id} className="flex justify-between py-1.5 border-b border-white/5 last:border-0">
                    <div><p className="text-sm text-white capitalize">{e.category}</p><p className="text-xs text-forest-500">{fmtDate(e.date)}</p></div>
                    <span className="text-sm font-bold text-white">{formatCO2(e.co2eKg)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'friends' && (
          <div className="space-y-4">
            <div className="card text-center p-4"><p className="text-xs text-forest-400 uppercase mb-2">Your Friend Code</p><p className="text-3xl font-black text-white tracking-[0.2em]">{user?.friendCode || '—'}</p></div>
            <div className="card p-4">
              <h3 className="text-sm font-bold text-white mb-3">Add Friend</h3>
              <form onSubmit={handleAddFriend} className="flex gap-2">
                <input value={friendCode} onChange={e => setFriendCode(e.target.value.toUpperCase())} placeholder="8-char code" maxLength={8} className="input flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none" />
                <button type="submit" className="btn-primary text-sm px-4">Add</button>
              </form>
              {friendMsg && <p className="text-xs mt-2 text-forest-400">{friendMsg}</p>}
            </div>
            <div className="space-y-3">
              {friends.map(f => (
                <div key={f.id} className="card p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative"><AvatarDisplay index={f.avatarIndex} size="md" /><span className={clsx('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-forest-900', onlineUsers[f.id] ? 'bg-green-400' : 'bg-forest-600')} /></div>
                    <div><p className="text-sm font-semibold text-white">{f.name}</p><p className="text-xs text-forest-400">🔥{f.streakDays}d · ⭐{f.points}pts</p></div>
                  </div>
                  <button onClick={() => setChatFriend(f)} className="relative bg-forest-500/20 p-2 rounded-xl text-forest-300">
                    <MessageCircle size={18} />
                    {unreadCounts[f.id] > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] px-1 rounded-full">{unreadCounts[f.id]}</span>}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'leaderboard' && <div className="card p-4"><h3 className="text-sm font-bold text-white mb-4">🏆 Global Ranking</h3><LeaderboardBar data={leaderboard} currentUserId={user?.id} /></div>}
        
        {activeTab === 'badges' && (
          <div className="grid grid-cols-3 gap-3">
            {badges.map(b => (
              <div key={b.id} className={clsx('card text-center p-3 flex flex-col items-center justify-center grayscale opacity-40', b.earned && 'grayscale-0 opacity-100 border-forest-400/40 bg-forest-500/10')}>
                <span className="text-2xl">{b.icon}</span><p className="text-[10px] font-bold text-white mt-1 leading-tight">{b.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
