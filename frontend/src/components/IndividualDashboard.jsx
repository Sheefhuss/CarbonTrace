import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trophy, Users, MessageCircle, Send, X, Leaf, CheckCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { AvatarDisplay, AvatarPickerModal } from './AvatarComponents';
import useAuthStore from '../context/authStore';
import { useAITips } from '../hooks/useData';
import { formatCO2, fmtDate, COUNTRY_AVERAGES, getDailyFact, computeBadges, CHALLENGES, getCurrentWeekKey, detectUserLocation } from '../utils/helpers';
import axios from 'axios';
import clsx from 'clsx';
import socket from '../socket';

function getDateLabel(dateStr) {
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const d = new Date(dateStr);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

function FriendChatModal({ friend, currentUser, onClose, onlineUsers }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [deleteMenu, setDeleteMenu] = useState(null);
  const bottomRef = useRef(null);
  const isOnline = onlineUsers[friend.id] || false;

  useEffect(() => {
    axios.get(`/api/users/messages/${friend.id}`).then(r => setMessages(r.data));
  }, [friend.id]);

  useEffect(() => {
    const handleNew = (msg) => { if (msg.senderId === friend.id) setMessages(p => (p.find(m => m.id === msg.id) ? p : [...p, msg])); };
    const handleDel = (id) => setMessages(p => p.filter(m => m.id !== id));
    socket.on('receive_message', handleNew);
    socket.on('message_deleted', handleDel);
    return () => { socket.off('receive_message', handleNew); socket.off('message_deleted', handleDel); };
  }, [friend.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim()) return;
    try {
      const res = await axios.post(`/api/users/messages/${friend.id}`, { text: input.trim() });
      setMessages(p => [...p, res.data]);
      socket.emit('send_message', res.data);
      setInput('');
    } catch (err) {}
  };

  const del = async (id) => {
    try {
      await axios.delete(`/api/users/messages/${id}`);
      socket.emit('delete_message', id);
      setDeleteMenu(null);
    } catch (err) {}
  };

  const grouped = [];
  let last = null;
  messages.forEach(m => {
    const l = getDateLabel(m.createdAt || m.date);
    if (l !== last) { grouped.push({ type: 'sep', label: l }); last = l; }
    grouped.push({ type: 'msg', data: m });
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setDeleteMenu(null)}>
      <div className="w-full max-w-md bg-forest-900 border border-white/10 rounded-3xl flex flex-col h-[600px] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 p-4 bg-white/5 border-b border-white/10">
          <div className="relative">
            <AvatarDisplay index={friend.avatarIndex} size="md" />
            <span className={clsx("absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-forest-900", isOnline ? "bg-green-500" : "bg-forest-700")} />
          </div>
          <div className="flex-1">
            <p className="font-bold text-white text-base">{friend.name}</p>
            <p className="text-xs text-forest-400 font-medium">{isOnline ? 'Online now' : 'Offline'}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-white transition-colors"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-hide">
          {grouped.map((item, i) => item.type === 'sep' ? (
            <div key={i} className="flex items-center py-4"><div className="flex-1 h-px bg-white/5"/><span className="text-[10px] uppercase text-forest-500 px-4 font-black tracking-widest">{item.label}</span><div className="flex-1 h-px bg-white/5"/></div>
          ) : (
            <div key={item.data.id} className={clsx('flex flex-col', item.data.senderId === currentUser.id ? 'items-end' : 'items-start')}>
              <div className="relative group max-w-[85%]">
                <div 
                  className={clsx('px-4 py-2.5 rounded-2xl text-sm transition-all', item.data.senderId === currentUser.id ? 'bg-forest-500 text-white rounded-tr-none' : 'bg-white/10 text-forest-100 rounded-tl-none')}
                  onClick={(e) => { e.stopPropagation(); if(item.data.senderId === currentUser.id) setDeleteMenu(deleteMenu === item.data.id ? null : item.data.id); }}
                >
                  {item.data.text}
                </div>
                {deleteMenu === item.data.id && (
                  <div className="absolute right-0 top-full mt-1 z-20">
                    <button onClick={() => del(item.data.id)} className="bg-red-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-xl hover:bg-red-600 transition-colors">Delete for everyone</button>
                  </div>
                )}
              </div>
              <span className="text-[9px] text-forest-600 mt-1 px-1 font-bold">
                {new Date(item.data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
        <div className="p-4 bg-white/5 border-t border-white/10 flex gap-2">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="Type your message..."
            className="flex-1 bg-forest-950/50 border border-white/5 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all" 
            onKeyDown={e => e.key === 'Enter' && send()}
          />
          <button onClick={send} className="bg-forest-500 hover:bg-forest-400 p-3 rounded-2xl text-white transition-all active:scale-95 shadow-lg shadow-forest-500/20"><Send size={20}/></button>
        </div>
      </div>
    </div>
  );
}

export default function IndividualDashboard({ setShowLogModal, emissions, emissionsLoading, refetch }) {
  const { user, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [friends, setFriends] = useState([]);
  const [unread, setUnread] = useState({});
  const [online, setOnline] = useState({});
  const [friendCode, setFriendCode] = useState('');
  const [friendMsg, setFriendMsg] = useState('');
  const [chatFriend, setChatFriend] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { tips, loading: tipsLoading } = useAITips(emissions, user);
  const badges = computeBadges(user, emissions);
  const weekKey = getCurrentWeekKey();

  useEffect(() => {
    if (!user?.id) return;
    const announce = () => socket.emit('user_online', user.id);
    socket.on('connect', announce);
    socket.on('status_update', ({ userId, status }) => setOnline(p => ({ ...p, [userId]: status === 'online' })));
    socket.on('sync_online_users', (ids) => { const s = {}; ids.forEach(id => s[id] = true); setOnline(s); });
    if (socket.connected) announce();
    return () => { socket.off('connect'); socket.off('status_update'); socket.off('sync_online_users'); };
  }, [user?.id]);

  useEffect(() => {
    axios.get('/api/users/friends').then(r => setFriends(r.data));
    axios.get('/api/users/messages/unread-counts').then(r => setUnread(r.data));
    axios.get('/api/dashboard/leaderboard').then(r => setLeaderboard(r.data.leaderboard || []));
  }, [user?.id]);

  const addFriend = async (e) => {
    e.preventDefault();
    if (!friendCode.trim()) return;
    try {
      const res = await axios.post('/api/users/connect-friend', { friendCode });
      setFriendMsg(`✅ ${res.data.message}`); setFriendCode('');
      axios.get('/api/users/friends').then(r => setFriends(r.data));
    } catch (err) { setFriendMsg(`❌ ${err.response?.data?.error || 'Error adding friend'}`); }
  };

  const challenges = (CHALLENGES || []).map(c => {
    const progress = typeof c.check === 'function' ? c.check(emissions, user) : 0;
    const pct = Math.min(Math.round((progress / c.target) * 100), 100);
    const completed = user?.completedChallenges?.includes(`${c.id}_${weekKey}`) || pct >= 100;
    return { ...c, progress, pct, completed };
});

  const groupedActivities = [];
  let lastActLabel = null;
  emissions.slice(0, 10).forEach(e => {
    const l = getDateLabel(e.date);
    if (l !== lastActLabel) { groupedActivities.push({ type: 'sep', label: l }); lastActLabel = l; }
    groupedActivities.push({ type: 'act', data: e });
  });

  const monthlyKg = emissions.filter(e => new Date(e.date).getMonth() === new Date().getMonth()).reduce((s, e) => s + parseFloat(e.co2eKg), 0);
  const countryAvg = COUNTRY_AVERAGES[user?.country || 'WORLD']?.kgPerMonth || 400;

  const displayTips = tips && tips.length > 0 ? tips : FALLBACK_TIPS_STATIC;

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto">
      {chatFriend && <FriendChatModal friend={chatFriend} currentUser={user} onClose={() => setChatFriend(null)} onlineUsers={online} />}
      {showAvatarModal && <AvatarPickerModal current={user?.avatarIndex} onClose={() => setShowAvatarModal(false)} onSave={async (idx) => { updateUser({ avatarIndex: idx }); setShowAvatarModal(false); await axios.put('/api/auth/profile', { avatarIndex: idx }); }} />}

      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-4">
          <button onClick={() => setShowAvatarModal(true)} className="relative group rounded-2xl overflow-hidden shadow-xl ring-2 ring-white/5 transition-all hover:ring-forest-500">
            <AvatarDisplay index={user?.avatarIndex} size="lg" />
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-black text-white text-[10px] uppercase tracking-widest">Edit</div>
          </button>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Hi, {user?.name?.split(' ')[0]} 👋</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-orange-500/20 border border-orange-500/30 text-orange-400 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">🔥 {user?.streakDays || 0}d Streak</span>
              <span className="bg-amber-400/20 border border-amber-400/40 text-amber-300 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest shadow-sm">⭐ {user?.points || 0} Points</span>
            </div>
          </div>
        </div>
        <button onClick={() => setShowLogModal(true)} className="bg-forest-500 hover:bg-forest-400 text-white p-3.5 rounded-2xl shadow-lg shadow-forest-500/20 transition-all active:scale-90"><Plus size={24}/></button>
      </div>

      <div className="bg-gradient-to-br from-forest-800/80 to-forest-950/90 p-6 rounded-[32px] border border-white/5 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10"><Leaf size={120} className="text-white rotate-12"/></div>
        <div className="relative z-10">
          <div className="flex justify-between items-end mb-6">
            <div>
              <p className="text-[10px] text-forest-400 uppercase tracking-[0.3em] font-black mb-1">Monthly Emissions</p>
              <p className="text-4xl font-black text-white tracking-tighter">{formatCO2(monthlyKg)}</p>
            </div>
            <div className="text-right">
              <p className={clsx('text-sm font-black uppercase tracking-widest', monthlyKg < countryAvg ? 'text-forest-400' : 'text-amber-400')}>
                {monthlyKg < countryAvg ? 'Good Performance' : 'High Usage'}
              </p>
              <p className="text-[11px] text-forest-500 font-bold mt-1">{Math.round(Math.abs((monthlyKg - countryAvg)/countryAvg)*100)}% {monthlyKg < countryAvg ? 'below' : 'above'} your country avg</p>
            </div>
          </div>
          <div className="h-3 bg-black/30 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-forest-500 shadow-[0_0_15px_rgba(64,146,109,0.6)] transition-all duration-1000" style={{ width: `${Math.min((monthlyKg/countryAvg)*100, 100)}%` }}/>
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 bg-white/5 p-1.5 rounded-[20px] overflow-x-auto scrollbar-hide border border-white/5 shadow-inner">
        {['overview', 'challenges', 'leaderboard', 'friends', 'badges'].map(t => (
          <button 
            key={t} 
            onClick={() => setActiveTab(t)} 
            className={clsx('flex-1 py-2.5 px-5 rounded-[14px] text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap', activeTab === t ? 'bg-forest-500 text-white shadow-lg' : 'text-forest-500 hover:text-white hover:bg-white/5')}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white/2 p-5 rounded-[28px] border border-white/5 shadow-xl">
            <h3 className="text-[11px] font-black text-forest-500 uppercase tracking-widest mb-4 flex items-center gap-2"><Lightbulb size={14} /> Smart Recommendations</h3>
            {tipsLoading ? (
              <div className="space-y-3"><div className="h-16 bg-white/5 rounded-2xl animate-pulse"/><div className="h-16 bg-white/5 rounded-2xl animate-pulse"/></div>
            ) : (
              <div className="space-y-3">
                {displayTips.map((t, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/8 transition-all group">
                    <span className="text-3xl transition-transform group-hover:scale-110 duration-300">{t.icon}</span>
                    <div><p className="text-sm font-bold text-white mb-1">{t.title}</p><p className="text-xs text-forest-300 leading-relaxed font-medium">{t.desc}</p></div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="bg-white/2 p-5 rounded-[28px] border border-white/5 shadow-xl">
            <h3 className="text-[11px] font-black text-forest-500 uppercase tracking-widest mb-4">Activity Logs</h3>
            <div className="space-y-1">
              {groupedActivities.map((item, i) => item.type === 'sep' ? (
                <div key={i} className="flex items-center py-3 first:pt-0">
                  <div className="flex-1 h-px bg-white/5"/><span className="text-[9px] uppercase text-forest-600 px-3 font-black tracking-widest">{item.label}</span><div className="flex-1 h-px bg-white/5"/>
                </div>
              ) : (
                <div key={item.data.id} className="flex justify-between items-center py-3 group hover:bg-white/2 rounded-xl px-2 -mx-2 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-forest-500/10 rounded-xl flex items-center justify-center text-forest-500 font-black capitalize text-xs">{item.data.category.charAt(0)}</div>
                    <div><p className="text-sm font-bold text-white capitalize">{item.data.category}</p><p className="text-[9px] text-forest-600 font-bold uppercase mt-0.5 tracking-tighter">{item.data.subCategory || 'General Entry'}</p></div>
                  </div>
                  <span className="text-sm font-black text-white bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">{formatCO2(item.data.co2eKg)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="grid gap-3 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between px-2 mb-2">
            <p className="text-[10px] font-bold text-forest-600 uppercase tracking-widest">Active Weekly Tasks</p>
            <RefreshCw size={12} className="text-forest-600" />
          </div>
          {challenges.map(c => (
            <div key={c.id} className={clsx('p-5 rounded-[28px] border transition-all duration-500', c.completed ? 'bg-forest-500/10 border-forest-500/40' : 'bg-white/2 border-white/5')}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-black/20 rounded-2xl flex items-center justify-center text-3xl shadow-inner">{c.icon}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-white">{c.name}</p>
                      {c.completed && <CheckCircle size={14} className="text-forest-400" />}
                    </div>
                    <p className="text-xs text-forest-400 mt-1 font-medium">{c.desc}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest">+{c.points} pts</p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-forest-500 font-black uppercase tracking-tighter">
                  <span>Progress: {c.progress} / {c.target} {c.unit}</span>
                  <span className={c.completed ? 'text-forest-400' : ''}>{c.pct}%</span>
                </div>
                <div className="h-2 bg-black/20 rounded-full overflow-hidden border border-white/5">
                  <div className={clsx('h-full transition-all duration-1000', c.completed ? 'bg-forest-500' : 'bg-forest-300')} style={{ width: `${c.pct}%` }}/>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="bg-white/2 p-6 rounded-[28px] border border-white/5 text-center shadow-xl">
            <p className="text-[10px] text-forest-500 uppercase tracking-[0.3em] mb-3 font-black">Your Unique Code</p>
            <p className="text-3xl font-black text-white tracking-[0.4em] font-mono select-all cursor-copy">{user?.friendCode}</p>
          </div>
          <div className="bg-white/2 p-5 rounded-[28px] border border-white/5 shadow-xl">
            <h3 className="text-[11px] font-black text-forest-500 uppercase tracking-widest mb-4">Connect with Friends</h3>
            <form onSubmit={addFriend} className="flex gap-2">
              <input 
                value={friendCode} 
                onChange={e => setFriendCode(e.target.value.toUpperCase())} 
                placeholder="Paste 8-char code here" 
                maxLength={8} 
                className="flex-1 bg-forest-950/50 border border-white/10 rounded-2xl px-5 py-3.5 text-white text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-forest-500 transition-all placeholder:text-forest-800" 
              />
              <button type="submit" className="bg-forest-500 hover:bg-forest-400 text-white px-6 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-lg shadow-forest-500/20 transition-all active:scale-95">Add</button>
            </form>
            {friendMsg && <p className={clsx("text-[10px] mt-3 font-black uppercase tracking-widest text-center", friendMsg.includes('✅') ? "text-forest-400" : "text-red-400")}>{friendMsg}</p>}
          </div>
          <div className="space-y-3">
            {friends.map(f => (
              <div key={f.id} className="bg-white/2 p-4 rounded-[24px] flex items-center justify-between border border-white/5 hover:bg-white/5 transition-all group shadow-md">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <AvatarDisplay index={f.avatarIndex} size="md" />
                    {online[f.id] && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-forest-950 ring-2 ring-green-500/20"/>}
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">{f.name}</p>
                    <p className="text-[10px] text-forest-500 font-bold uppercase mt-0.5 tracking-wider">🔥 {f.streakDays || 0}d · ⭐ {f.points}pts</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setChatFriend(f); setUnread(p => ({ ...p, [f.id]: 0 })); }} 
                  className="relative bg-forest-500/10 hover:bg-forest-500/20 p-3 rounded-2xl text-forest-400 border border-white/5 transition-all active:scale-90"
                >
                  <MessageCircle size={20} />
                  {unread[f.id] > 0 && <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg ring-2 ring-forest-900 animate-bounce">{unread[f.id]}</span>}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leaderboard' && (
        <div className="bg-white/2 p-6 rounded-[32px] border border-white/5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-black text-forest-500 uppercase tracking-widest flex items-center gap-2"><Trophy size={16} className="text-amber-400" /> Global Ranking</h3>
            <span className="text-[10px] font-bold text-forest-600 bg-white/5 px-3 py-1 rounded-full uppercase tracking-tighter">Live Updates</span>
          </div>
          <div className="space-y-2">
            {leaderboard.map((l, i) => (
              <div key={l.id} className={clsx('flex items-center gap-4 p-3.5 rounded-[20px] transition-all border border-transparent', l.id === user?.id ? 'bg-forest-500/15 border-forest-500/20 ring-1 ring-forest-500/10' : 'hover:bg-white/5')}>
                <span className={clsx("text-xs font-black w-6 text-center", i === 0 ? "text-amber-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-orange-400" : "text-forest-600")}>#{i+1}</span>
                <AvatarDisplay index={l.avatarIndex} size="sm" />
                <span className={clsx("text-sm font-bold flex-1 truncate", l.id === user?.id ? "text-white" : "text-forest-100")}>{l.name} {l.id === user?.id && <span className="text-[9px] bg-forest-500 text-white px-2 py-0.5 rounded-full ml-2 uppercase font-black tracking-tighter">You</span>}</span>
                <div className="text-right">
                  <p className="text-sm font-black text-white">{l.points}</p>
                  <p className="text-[9px] text-forest-600 font-bold uppercase tracking-tighter">Points</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'badges' && (
        <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {badges.map(b => (
            <div 
              key={b.id} 
              className={clsx(
                'p-5 rounded-[28px] border flex flex-col items-center justify-center transition-all duration-700 shadow-lg', 
                b.earned ? 'bg-gradient-to-br from-forest-500/20 to-forest-500/5 border-forest-500/40 opacity-100 scale-100' : 'bg-white/2 border-white/5 opacity-30 grayscale scale-95'
              )}
            >
              <div className="text-4xl mb-3 drop-shadow-lg">{b.icon}</div>
              <p className="text-[10px] font-black text-white uppercase leading-tight tracking-tighter text-center">{b.name}</p>
              <div className="mt-2 h-1 w-8 bg-white/10 rounded-full overflow-hidden">
                {b.earned && <div className="h-full bg-forest-400 w-full animate-pulse"/>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const FALLBACK_TIPS_STATIC = [
  { icon: '🚗', title: 'Reduce short car trips', desc: 'Walk or cycle for trips under 2 km.' },
  { icon: '🥗', title: 'Try meat-free days', desc: 'Cutting meat twice a week makes a big difference.' },
  { icon: '💡', title: 'Switch to LED lighting', desc: 'LEDs use 75% less energy than old bulbs.' },
];

const BADGE_MAP = {
  first_log:'🌱', week_streak:'🔥', month_streak:'⚡', ten_logs:'📊', fifty_logs:'🏆', below_avg:'🌍', offset_1t:'🌲', quiz_done:'📝', veg_week:'🥗', no_car:'🚶', century:'💯', friend_made:'🤝',
};
const getBadgeIcon = (id) => BADGE_MAP[id] || '🏅';
