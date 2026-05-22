import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, CheckCircle, XCircle, HelpCircle, Clock, ChevronRight, AlertCircle, Train, Sun, Moon, Cloud, CloudRain, CloudSnow, CloudFog, TrendingUp, Award, Target, Sparkles, Zap, Compass, Trophy, Megaphone } from 'lucide-react';
import { format, parseISO, differenceInSeconds, getHours, isAfter, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import TransitPlanner from '../components/TransitPlanner';
import { fetchWeather, formatDayLabel, WeatherData } from '../lib/weather';

/* ── Countdown Timer ── */
function Countdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  useEffect(() => {
    const target = parseISO(deadline);
    const update = () => setTimeLeft(Math.max(0, differenceInSeconds(target, new Date())));
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline]);
  if (timeLeft === 0) return null;
  const d = Math.floor(timeLeft / 86400);
  const h = Math.floor((timeLeft % 86400) / 3600);
  const m = Math.floor((timeLeft % 3600) / 60);
  const s = timeLeft % 60;
  return (
    <div className="flex items-center gap-1 text-xs font-mono text-danger font-bold bg-danger/10 px-2.5 py-1 rounded-full border border-danger/20">
      <AlertCircle className="w-3 h-3" />
      {d > 0 && <span>{d}T</span>}
      <span>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
    </div>
  );
}

/* ── Event Card (compact, app-style) ── */
function EventCard({ inv, onRoute }: { inv: any; onRoute: (e: any) => void }) {
  const isPending = inv.status === 'pending';
  const isUrgent = inv.response_deadline && differenceInSeconds(parseISO(inv.response_deadline), new Date()) < 86400;
  return (
    <Link to={`/invite/${inv.token}`} className={`block rounded-2xl border ${isUrgent ? 'border-danger/20 bg-danger/[0.02]' : 'border-border bg-surface-muted'} hover:border-accent/30 active:scale-[0.98] transition-all overflow-hidden`}>
      <div className="flex items-center gap-3 p-3.5">
        {/* Date badge */}
        <div className="w-12 h-12 shrink-0 bg-surface-elevated rounded-xl flex flex-col items-center justify-center border border-border">
          <span className="text-[8px] font-bold uppercase text-accent leading-none">{format(parseISO(inv.date), 'MMM', { locale: de })}</span>
          <span className="text-base font-bold text-text leading-none mt-0.5">{format(parseISO(inv.date), 'dd')}</span>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-text truncate">{inv.title}</h3>
          <div className="flex items-center gap-3 text-xs text-text-dim mt-1">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(inv.date), 'HH:mm')}</span>
            {inv.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{inv.location}</span>}
          </div>
        </div>
        {/* Status / Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isPending ? (
            isUrgent ? <Countdown deadline={inv.response_deadline} /> : <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          ) : (
            <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
              inv.status === 'yes' ? 'text-success border-success/20 bg-success/10' :
              inv.status === 'maybe' ? 'text-warning border-warning/20 bg-warning/10' :
              'text-danger border-danger/20 bg-danger/10'
            }`}>
              {inv.status === 'yes' ? 'Dabei' : inv.status === 'maybe' ? '?' : 'Nein'}
            </span>
          )}
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRoute(inv); }}
            className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-accent hover:border-accent/30 transition-all active:scale-90">
            <Train className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Link>
  );
}

/* ── Main ── */
export default function PersonDashboard() {
  const [user, setUser] = useState<any>(null);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPersonRecord, setHasPersonRecord] = useState(true);
  const [transitAktion, setTransitAktion] = useState<any>(null);
  const [showPast, setShowPast] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/check');
        if (!res.ok) { setHasPersonRecord(false); setLoading(false); return; }
        const data = await res.json();
        setUser(data.user);
        const invRes = await fetch('/api/public/dashboard');
        if (invRes.ok) setInvitations(await invRes.json());
      } catch { setHasPersonRecord(false); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    const next = invitations.filter(i => new Date(i.date) >= new Date() && i.location)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];
    if (next) fetchWeather(next.location, next.date).then(setWeather).catch(() => {});
  }, [invitations]);

  const upcoming = invitations.filter(i => new Date(i.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = invitations.filter(i => new Date(i.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const pending = upcoming.filter(i => i.status === 'pending');
  const responded = upcoming.filter(i => i.status !== 'pending');

  const totalInvited = invitations.length;
  const totalYes = invitations.filter(i => i.status === 'yes').length;
  const pct = totalInvited > 0 ? Math.round((totalYes / totalInvited) * 100) : 0;
  const sortedPast = [...past].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  let streak = 0;
  for (const inv of sortedPast) { if (inv.status === 'yes') streak++; else break; }
  const typeBreak: Record<string, number> = {};
  invitations.forEach(inv => { const t = inv.event_type || 'Event'; typeBreak[t] = (typeBreak[t] || 0) + (inv.status === 'yes' ? 1 : 0); });
  const favType = Object.entries(typeBreak).sort((a, b) => (b[1] as number) - (a[1] as number))[0]?.[0];

  const getWeatherIcon = (code: number) => {
    if (code <= 1) return { icon: Sun, color: 'text-amber-400' };
    if (code <= 3) return { icon: Cloud, color: 'text-white/50' };
    if (code >= 51) return { icon: CloudRain, color: 'text-blue-400' };
    return { icon: Cloud, color: 'text-white/40' };
  };
  const greeting = (() => {
    const h = getHours(new Date());
    if (h < 6) return { text: 'Gute Nacht', icon: Moon };
    if (h < 12) return { text: 'Guten Morgen', icon: Sun };
    if (h < 18) return { text: 'Guten Tag', icon: Sun };
    return { text: 'Guten Abend', icon: Cloud };
  })();

  if (loading) return <div className="text-center py-24 text-text-dim text-sm">Lade...</div>;
  if (!hasPersonRecord) return (
    <div className="pb-24 px-4">
      <div className="bg-surface-muted p-10 rounded-[2rem] border border-border text-center max-w-sm mx-auto">
        <Calendar className="w-8 h-8 text-text-dim mx-auto mb-4" />
        <h2 className="text-lg font-bold text-text mb-2">Keine persönliche Übersicht</h2>
        <p className="text-sm text-text-dim">Dein Konto ist nicht mit einer Person verknüpft.</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 pb-28 max-w-2xl mx-auto">

      {/* Greeting */}
      <section className="px-4">
        <div className="bg-surface-elevated border border-border rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 bg-accent/10 rounded-xl`}>
              <greeting.icon className="w-5 h-5 text-accent" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-text">
                {greeting.text}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
              </h1>
              <p className="text-xs text-text-dim mt-0.5">
                {upcoming.length > 0 ? `${upcoming.length} kommende Aktionen` : 'Keine kommenden Aktionen'}
              </p>
            </div>
              {upcoming[0] && (
              <div className="px-2.5 py-1 bg-accent/10 border border-accent/20 rounded-full text-xs font-semibold text-accent shrink-0">
                {format(parseISO(upcoming[0].date), 'dd. MMM', { locale: de })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pending invitations */}
      {pending.length > 0 && (
        <section className="px-4">
          <div className="flex items-center gap-3 mb-3">
            <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
            <h2 className="text-sm font-bold text-text">{pending.length} offene Einladung{pending.length > 1 ? 'en' : ''}</h2>
          </div>
          <div className="space-y-2">
            {pending.map((inv, i) => (
              <EventCard key={inv.id} inv={inv} onRoute={setTransitAktion} />
            ))}
          </div>
        </section>
      )}

      {/* No pending → featured next confirmed */}
      {!pending.length && responded.length > 0 && (
        <section className="px-4">
          <Link to={`/invite/${responded[0].token}`} className="block">
            <div className="bg-surface-elevated border border-border rounded-2xl p-4 hover:border-accent/30 transition-all relative overflow-hidden group">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-accent/5 rounded-full blur-2xl pointer-events-none" />
              <div className="relative z-10 flex items-center gap-4">
                <div className="w-14 h-14 shrink-0 bg-surface-muted rounded-xl flex flex-col items-center justify-center border border-border">
                  <span className="text-[8px] font-bold uppercase text-accent">{format(parseISO(responded[0].date), 'MMM', { locale: de })}</span>
                  <span className="text-lg font-bold text-text">{format(parseISO(responded[0].date), 'dd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-[10px] font-bold text-success uppercase tracking-wider">Nächstes Event</span>
                  </div>
                  <h3 className="text-base font-bold text-text truncate">{responded[0].title}</h3>
                  <p className="text-xs text-text-dim mt-0.5 truncate">
                    {format(parseISO(responded[0].date), 'EEEE, dd. MMM yyyy · HH:mm', { locale: de })}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-text-dim group-hover:text-accent group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Weather — only if data exists */}
      {weather && (
        <section className="px-4">
          <div className="bg-surface-elevated border border-border rounded-2xl p-3.5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-text-dim" />
                <span className="text-xs text-text-dim truncate max-w-[160px]">
                  {invitations.filter(i => new Date(i.date) >= new Date() && i.location)
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]?.location || ''}
                </span>
              </div>
              <span className="text-[9px] font-bold uppercase text-text-dim/50">3-Tage</span>
            </div>
            <div className="flex gap-2">
              {[weather.day1, weather.day2, weather.day3].map((day, i) => {
                if (!day) return null;
                const w = getWeatherIcon(day.code);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-blue-500/5 border border-blue-500/10">
                    <span className="text-[8px] font-bold text-text-dim/60 uppercase">{formatDayLabel(day.date, i - 1)}</span>
                    <w.icon className={`w-4 h-4 ${w.color}`} />
                    <span className="text-sm font-bold text-text">{day.temp}°</span>
                    <span className="text-[9px] text-text-dim">{day.condition}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}


      {/* Responded upcoming events */}
      {responded.length > (pending.length === 0 ? 1 : 0) && (
        <section className="px-4">
          <h2 className="text-sm font-bold text-text mb-3">Weitere Zusagen</h2>
          <div className="space-y-2">
            {(pending.length === 0 ? responded.slice(1) : responded).map((inv, i) => (
              <EventCard key={inv.id} inv={inv} onRoute={setTransitAktion} />
            ))}
          </div>
        </section>
      )}

      {/* Past events — collapsed */}
      {past.length > 0 && (
        <section className="px-4">
          <button onClick={() => setShowPast(!showPast)}
            className="flex items-center gap-2 text-sm font-semibold text-text-dim hover:text-text transition-colors mb-2">
            Vergangene <span className="text-xs bg-surface-elevated border border-border rounded-full px-2 py-0.5">{past.length}</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showPast ? 'rotate-90' : ''}`} />
          </button>
          <AnimatePresence>
            {showPast && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="bg-surface-muted border border-border rounded-xl overflow-hidden divide-y divide-border/50">
                  {past.map((inv, i) => (
                    <Link key={inv.id} to={`/invite/${inv.token}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated transition-colors group">
                      <span className="text-xs text-text-dim font-mono w-20 shrink-0">{format(parseISO(inv.date), 'dd.MM.yy', { locale: de })}</span>
                      <span className="flex-1 text-sm text-text-muted group-hover:text-text truncate">{inv.title}</span>
                      <span className={`text-xs font-semibold shrink-0 ${inv.status === 'yes' ? 'text-success' : 'text-text-dim'}`}>
                        {inv.status === 'yes' ? 'Dabei' : '—'}
                      </span>
                    </Link>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      )}

      {/* Stats chips */}
      {totalInvited > 0 && (
        <section className="px-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs">
              <Target className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-text">{pct}%</span>
              <span className="text-text-dim">Beteiligung</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-text">{totalInvited}</span>
              <span className="text-text-dim">Events</span>
            </div>
            {streak > 1 && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs">
                <Award className="w-3.5 h-3.5 text-accent" />
                <span className="font-bold text-text">{streak}</span>
                <span className="text-text-dim">in Folge</span>
              </div>
            )}
            {favType && (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
                <span className="text-text-dim capitalize">{favType}</span>
              </div>
            )}
          </div>
        </section>
      )}

      <TransitPlanner
        isOpen={transitAktion !== null}
        onClose={() => setTransitAktion(null)}
        destination={transitAktion?.location}
        destinationName={transitAktion?.location}
        eventStartTime={transitAktion?.date}
      />
    </div>
  );
}
