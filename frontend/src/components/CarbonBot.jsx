import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { X, Send, Minimize2 } from 'lucide-react';
import clsx from 'clsx';

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

const buildSystemPrompt = (user, dashboardData) => {
  const firstName = user?.name?.split(' ')[0] || 'the user';
  const monthlyKg = dashboardData?.monthlyKg ?? 0;
  const streak = user?.streakDays ?? 0;
  const points = user?.points ?? 0;
  const badges = (user?.earnedBadges ?? []).join(', ') || 'none yet';
  const topCat = dashboardData?.topCategory || 'nothing logged yet';
  const totalLogs = dashboardData?.totalLogs ?? 0;
  const country = user?.country || 'IND';
  const countryAvgMap = {
    IND: 150, USA: 1500, GBR: 750, DEU: 870, FRA: 600,
    AUS: 1400, CAN: 1380, BRA: 220, CHN: 580, WORLD: 400,
  };
  const countryAvg = countryAvgMap[country] || 400;
  const vsAvg = monthlyKg > 0
    ? monthlyKg < countryAvg
      ? `${Math.round(((countryAvg - monthlyKg) / countryAvg) * 100)}% BELOW country average — celebrate this`
      : `${Math.round(((monthlyKg - countryAvg) / countryAvg) * 100)}% ABOVE country average — gently encourage improvement`
    : 'no emissions logged yet this month';

  return `You are CarbonBot, the built-in AI assistant for CarbonTrace — a personal carbon footprint tracking app. You are friendly, specific, and data-driven.

═══ LIVE DASHBOARD DATA — always reference this in your answers ═══
User's name: ${firstName}
This month's CO₂: ${monthlyKg > 0 ? Math.round(monthlyKg) + ' kg CO₂e' : 'nothing logged yet'}
vs country average (${country}, ${countryAvg} kg/mo): ${vsAvg}
Streak: ${streak} days  |  Points: ${points}  |  Activities logged: ${totalLogs}
Top emission source: ${topCat}
Badges earned: ${badges}
═══════════════════════════════════════════════════════════════════

CarbonTrace emission factors (use exact numbers):
Transport: Petrol car 0.192 kg/km, EV 0.053 kg/km, Bus/Metro 0.105 kg/km, Flight 0.255 kg/km, Bicycle 0 kg/km
Food: Chicken/Fish 1.5 kg/serving, Paneer/Dairy 2.0 kg, Dal/Rice 1.2 kg, Street food 1.0 kg, Vegan 0.8 kg
Shopping: Clothing 0.5 kg/USD, Electronics 1.2 kg/USD, Furniture 0.8 kg/USD
India electricity: 0.82 kg CO₂ per kWh
Points: +2 per log, +5 low-carbon bonus (<2 kg), +5 daily login, +10 registration
Paris target: 208 kg/month; India avg: 150 kg/month; World avg: 400 kg/month
Challenges: No-Meat Week +60, Green Commute +50, 5-Day Logger +40, Light Footprint +80, Cycle Hero +45, Plant Power +35, Zero Waste Week +55, Solar Saver +70

Your rules:
- ALWAYS use ${firstName}'s real numbers. Say "your ${Math.round(monthlyKg)} kg this month" not just "your emissions".
- Give specific, actionable answers with exact numbers.
- Be encouraging — celebrate streaks, badges, low emissions.
- Keep responses to 3-5 sentences unless a detailed explanation is needed.
- Use 1-2 emojis per response, not more.
- Address ${firstName} naturally in conversation, not every sentence.
- If asked something unrelated to carbon/climate/CarbonTrace, politely redirect.`;
};

const FALLBACK_RESPONSES = [
  "🚲 Cycling instead of driving 5 km/day saves ~350 kg CO₂/year — that's 175 points in CarbonTrace! Log it under Transport → Bicycle/Walk to earn your Cycle Hero challenge.",
  "🥗 Switching one chicken meal to plant-based saves ~0.7 kg CO₂. Log 7 plant-based meals this week to complete No-Meat Week for +60 pts!",
  "📊 The Paris 2030 target is 208 kg CO₂/month per person. Log activities daily to see exactly how you compare.",
  "⚡ India's grid emits 0.82 kg CO₂ per kWh — one of the world's highest. Energy-efficient appliances and solar panels make a measurable difference.",
  "🏆 To earn Century Club badge, reach 100 total points. Log 5 activities (+10 pts), daily logins (+5/day), claim a weekly challenge!",
];
let fallbackIndex = 0;

export default function CarbonBot({ user, emissions = [] }) {

  const dashboardData = useMemo(() => {
    if (!emissions.length) return { monthlyKg: 0, topCategory: null, totalLogs: 0 };
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const monthly = emissions.filter(e => e.date >= startOfMonth);
    const monthlyKg = monthly.reduce((s, e) => s + parseFloat(e.co2eKg || 0), 0);
    const byCat = {};
    monthly.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + parseFloat(e.co2eKg || 0); });
    const topCategory = Object.entries(byCat).sort(([, a], [, b]) => b - a)[0]?.[0] || null;
    return { monthlyKg, topCategory, totalLogs: emissions.length };
  }, [emissions]);

  const firstName = user?.name?.split(' ')[0] || null;

  const greeting = useMemo(() => {
    if (!firstName) {
      return "Hi! I'm CarbonBot 🌿 Ask me anything about your carbon footprint, how to earn points, or climate tips!";
    }
    const { monthlyKg } = dashboardData;
    const streak = user?.streakDays || 0;
    if (monthlyKg === 0) {
      return `Hi ${firstName}! 🌿 I'm CarbonBot, your personal carbon assistant. You haven't logged anything this month yet — want me to suggest where to start?`;
    }
    if (streak >= 7) {
      return `Hey ${firstName}! 🔥 ${streak}-day streak — impressive! You've logged ${Math.round(monthlyKg)} kg CO₂e this month. Ask me how to reduce it or earn more badges!`;
    }
    return `Hi ${firstName}! 🌿 You've logged ${Math.round(monthlyKg)} kg CO₂e this month. I'm CarbonBot — ask me about your footprint, challenges, or earning more points!`;
  }, [firstName, dashboardData.monthlyKg, user?.streakDays]);

  const floatingHints = useMemo(() => {
    const hints = [];
    if (firstName) hints.push(`Need help, ${firstName}? 🌿`);
    else hints.push('Need help reducing your footprint? 🌿');
    if (dashboardData.monthlyKg > 0) hints.push(`${Math.round(dashboardData.monthlyKg)} kg logged this month 📊`);
    if ((user?.streakDays ?? 0) >= 3) hints.push(`${user.streakDays}-day streak! Keep it up 🔥`);
    if (!(user?.earnedBadges?.length)) hints.push('Earn your first badge! Ask me how ⭐');
    hints.push('Which activity saves most CO₂? 🤔');
    return hints;
  }, [firstName, dashboardData.monthlyKg, user?.streakDays, user?.earnedBadges?.length]);
  const quickSuggestions = useMemo(() => {
    if (!dashboardData.monthlyKg) {
      return ['What should I log first? 🌱', 'How do I earn points? ⭐', 'What is the Paris target? 🌍', 'Which food saves most CO₂?'];
    }
    if (dashboardData.topCategory === 'transport') {
      return ['How do I reduce transport emissions?', 'How to complete Green Commute? 🚌', 'How do I earn more points? ⭐', 'What is the Paris target? 🌍'];
    }
    if (dashboardData.topCategory === 'food') {
      return ['How to reduce food emissions?', 'How to complete No-Meat Week? 🥗', 'How do I earn more points? ⭐', 'What is the Paris target? 🌍'];
    }
    return ['How to complete challenges? 🏆', 'Which activity saves most CO₂?', 'How do I earn more points? ⭐', 'What is the Paris target? 🌍'];
  }, [dashboardData.monthlyKg, dashboardData.topCategory]);
  
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: greeting }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [unread, setUnread] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [hintVisible, setHintVisible] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: greeting }]);
  }, [greeting]);

  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setHintVisible(true), 2500);
    return () => clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (open) return;
    const cycle = setInterval(() => {
      setHintVisible(false);
      setTimeout(() => {
        setHintIndex(i => (i + 1) % floatingHints.length);
        setHintVisible(true);
      }, 500);
    }, 5000);
    return () => clearInterval(cycle);
  }, [open, floatingHints.length]);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setHintVisible(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendWithText = useCallback(async (text, currentMessages) => {
    if (!text.trim() || loading) return;

    const userMsg = { role: 'user', content: text.trim() };
    const updatedMessages = [...currentMessages, userMsg];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      if (!GROQ_API_KEY) throw new Error('NO_KEY');

      const systemPrompt = buildSystemPrompt(user, dashboardData);

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            ...updatedMessages.slice(-8),
          ],
          max_tokens: 350,
          temperature: 0.6,
        }),
      });

      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ||
        FALLBACK_RESPONSES[fallbackIndex++ % FALLBACK_RESPONSES.length];

      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      if (!open) setUnread(u => u + 1);

    } catch {
      const reply = FALLBACK_RESPONSES[fallbackIndex++ % FALLBACK_RESPONSES.length];
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setLoading(false);
    }
  }, [loading, open, user, dashboardData]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const text = input;
    setInput('');
    sendWithText(text, messages);
  };

  const sendDirect = (text) => {
    setInput('');
    sendWithText(text, messages);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/*  */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">

          {hintVisible && (
            <div className="relative max-w-[200px] bg-forest-900 border border-forest-400/30 rounded-2xl
                            rounded-br-sm px-3 py-2 shadow-xl shadow-black/30"
              style={{ transition: 'opacity 0.3s, transform 0.3s', opacity: hintVisible ? 1 : 0 }}>
              <p className="text-xs text-forest-200 leading-relaxed">{floatingHints[hintIndex]}</p>
              <button onClick={() => setHintVisible(false)}
                className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-forest-700 rounded-full
                           text-forest-400 hover:text-white text-xs flex items-center justify-center">
                ×
              </button>
            </div>
          )}

          <button
            onClick={() => setOpen(true)}
            className="relative w-16 h-16 rounded-full shadow-2xl shadow-forest-500/40
                       bg-gradient-to-br from-forest-400 to-forest-600
                       hover:from-forest-300 hover:to-forest-500
                       transition-all duration-200 active:scale-95 flex items-center justify-center"
            style={{ animation: 'botFloat 3s ease-in-out infinite' }}
            title="Chat with CarbonBot"
          >
            <span className="text-3xl select-none">🤖</span>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse border-2 border-forest-500" />
            {unread > 0 && (
              <span className="absolute -top-1 -left-1 w-5 h-5 bg-red-500 rounded-full text-xs text-white
                               flex items-center justify-center font-bold border-2 border-forest-950">
                {unread}
              </span>
            )}
          </button>

          <style>{`@keyframes botFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}`}</style>
        </div>
      )}

      {/*  */}
      {open && (
        <div className={clsx(
          'fixed z-50 bg-forest-900 border border-white/10 shadow-2xl shadow-black/40 flex flex-col transition-all duration-300',
          'bottom-0 left-0 right-0 rounded-t-2xl sm:bottom-6 sm:left-auto sm:right-6 sm:rounded-2xl sm:w-96',
          minimised ? 'h-14' : 'h-[85dvh] sm:h-[560px]'
        )}>

          {/* Header */}
          <div className="flex items-center gap-3 p-4 border-b border-white/10 shrink-0 rounded-t-2xl
                          bg-gradient-to-r from-forest-800/80 to-forest-700/40">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-forest-500/30 border border-forest-400/30
                              flex items-center justify-center text-xl">
                🤖
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full
                               border-2 border-forest-900 animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-bold text-white">CarbonBot</p>
                {firstName && (
                  <span className="text-xs text-forest-400">· hi, {firstName}!</span>
                )}
              </div>
              <p className="text-xs text-forest-400">
                {GROQ_API_KEY ? '⚡ Groq AI · knows your data' : 'Offline · Add VITE_GROQ_API_KEY'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMinimised(m => !m)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-forest-400 hover:text-white transition-all">
                <Minimize2 size={14} />
              </button>
              <button onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-forest-400 hover:text-white transition-all">
                <X size={14} />
              </button>
            </div>
          </div>

          {/* */}
          {!minimised && user && dashboardData.monthlyKg > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 bg-white/3 shrink-0">
              <div className="flex-1 text-center">
                <p className="text-[10px] text-forest-500 leading-none mb-0.5">This month</p>
                <p className="text-sm font-bold text-white">{Math.round(dashboardData.monthlyKg)} kg</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex-1 text-center">
                <p className="text-[10px] text-forest-500 leading-none mb-0.5">Streak</p>
                <p className="text-sm font-bold text-white">🔥 {user.streakDays ?? 0}d</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex-1 text-center">
                <p className="text-[10px] text-forest-500 leading-none mb-0.5">Points</p>
                <p className="text-sm font-bold text-white">⭐ {user.points ?? 0}</p>
              </div>
              {dashboardData.topCategory && (
                <>
                  <div className="w-px h-6 bg-white/10" />
                  <div className="flex-1 text-center">
                    <p className="text-[10px] text-forest-500 leading-none mb-0.5">Top source</p>
                    <p className="text-xs font-semibold text-amber-400 capitalize">{dashboardData.topCategory}</p>
                  </div>
                </>
              )}
            </div>
          )}

          {!minimised && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((msg, i) => (
                  <div key={i} className={clsx('flex gap-2', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-forest-500/20 border border-forest-400/20
                                      flex items-center justify-center text-sm shrink-0 mt-0.5">
                        🤖
                      </div>
                    )}
                    <div className={clsx(
                      'max-w-[78%] px-3 py-2.5 rounded-2xl text-sm leading-relaxed',
                      msg.role === 'user'
                        ? 'bg-forest-500 text-white rounded-tr-sm shadow-md'
                        : 'bg-white/8 text-forest-100 border border-white/5 rounded-tl-sm'
                    )}>
                      {msg.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex gap-2 justify-start">
                    <div className="w-7 h-7 rounded-full bg-forest-500/20 flex items-center justify-center text-sm shrink-0">🤖</div>
                    <div className="bg-white/8 border border-white/5 rounded-2xl rounded-tl-sm px-4 py-3">
                      <div className="flex gap-1.5 items-center">
                        <div className="w-1.5 h-1.5 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-forest-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Quick suggestions — context-aware, only on first message */}
              {messages.length === 1 && (
                <div className="px-4 pb-3 shrink-0">
                  <p className="text-xs text-forest-500 mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {quickSuggestions.map(q => (
                      <button key={q} onClick={() => sendDirect(q)} disabled={loading}
                        className="text-xs bg-forest-500/15 border border-forest-400/20 text-forest-300
                                   px-2.5 py-1 rounded-full hover:bg-forest-500/30 hover:text-white
                                   transition-all disabled:opacity-40">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-3 border-t border-white/10 shrink-0">
                <div className="flex gap-2 items-end">
                  <textarea
                    ref={inputRef}
                    rows={1}
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={firstName ? `Ask me anything, ${firstName}…` : 'Ask me anything about carbon…'}
                    className="flex-1 resize-none bg-white/8 border border-white/10 rounded-xl px-3 py-2
                               text-sm placeholder:text-forest-500 focus:outline-none
                               focus:ring-2 focus:ring-forest-400 focus:border-transparent max-h-24"
                    style={{ color: 'white', WebkitTextFillColor: 'white' }}
                  />
                  <button onClick={sendMessage} disabled={loading || !input.trim()}
                    className="w-9 h-9 rounded-xl bg-forest-500 hover:bg-forest-400 disabled:opacity-40
                               flex items-center justify-center transition-all active:scale-95 shrink-0">
                    <Send size={14} className="text-white" />
                  </button>
                </div>
                <p className="text-xs text-forest-600 text-center mt-1.5">
                  {GROQ_API_KEY ? '⚡ Groq AI · personalised to your data' : 'Add VITE_GROQ_API_KEY to .env to enable AI'}
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
