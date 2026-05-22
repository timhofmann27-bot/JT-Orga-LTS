import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Calendar, MapPin, CheckCircle, XCircle, HelpCircle, Users, Lock, Mail, ArrowRight, User, AlertCircle, Train, Repeat, MessageSquare, Trash2, Send, Compass, Trophy, Megaphone, Zap, Sun, Cloud, CloudRain, Wind } from 'lucide-react';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import Avatar from '../components/Avatar';
import MapComponent from '../components/MapComponent';
import TransitPlanner from '../components/TransitPlanner';
import OnboardingWizard from '../components/OnboardingWizard';
import { generateVCalendar } from '../lib/calendar';
import { fetchWeather, getWeatherCategory, WeatherData } from '../lib/weather';

function Countdown({ deadline }: { deadline: string }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    const target = parseISO(deadline);
    const update = () => {
      const diff = differenceInSeconds(target, new Date());
      setTimeLeft(Math.max(0, diff));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [deadline]);

  if (timeLeft === 0) return null;

  const days = Math.floor(timeLeft / (24 * 3600));
  const hours = Math.floor((timeLeft % (24 * 3600)) / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        scale: timeLeft < 86400 ? [1, 1.01, 1] : 1
      }}
      transition={{ 
        scale: { duration: 3, repeat: Infinity, ease: "easeInOut" },
        default: { duration: 1, ease: [0.16, 1, 0.3, 1] }
      }}
      className="premium-card p-10 rounded-4xl flex flex-col items-center justify-center text-center shadow-none relative overflow-hidden group"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-red-500/[0.03] to-transparent pointer-events-none" />
      <div className="flex items-center gap-3 mb-6">
        <div className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
        <span className="micro-label !text-red-400/60 uppercase tracking-[0.3em]">Rückmeldung offen</span>
      </div>
      <div className="flex gap-10 font-serif text-5xl font-black text-white tracking-widest leading-none">
        {days > 0 && (
          <div className="flex flex-col items-center gap-2">
            <span className="text-white">{days}</span>
            <span className="micro-label !opacity-30">Tage</span>
          </div>
        )}
        <div className="flex flex-col items-center gap-2">
          <span className="text-white">{hours.toString().padStart(2, '0')}</span>
          <span className="micro-label !opacity-30">Std</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="text-white">{minutes.toString().padStart(2, '0')}</span>
          <span className="micro-label !opacity-30">Min</span>
        </div>
        <div className="flex flex-col items-center gap-2 text-red-400/60">
          <span className="text-red-400/80">{seconds.toString().padStart(2, '0')}</span>
          <span className="micro-label !opacity-30 !text-red-400/20">Sek</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function PublicInvite() {
  const [token] = useState(useParams().token);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  const [status, setStatus] = useState('');
  const [comment, setComment] = useState('');
  const [guestsCount, setGuestsCount] = useState(0);
  const [checklist, setChecklist] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');

  // Profile setup & Login state
  const [setupUsername, setSetupUsername] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    fetch('/api/public/check')
      .then(res => res.json())
      .then(data => {
        setIsAdmin(data.isAdmin);
        setCurrentUser(data.user);
      })
      .catch(() => {
        setIsAdmin(false);
        setCurrentUser(null);
      });

    fetch(`/api/public/invite/${token}`)
      .then(res => {
        if (!res.ok) throw new Error('Ungültiger Link');
        return res.json();
      })
      .then(d => {
        setData(d);
        setStatus(d.invitee.status === 'pending' ? '' : d.invitee.status);
        setComment(d.invitee.comment || '');
        setGuestsCount(d.invitee.guests_count || 0);
        setChecklist(d.checklist || []);
        setPolls(d.polls || []);
        setMessages(d.messages || []);
        
        // Suggest username if not set
        if (!d.invitee.has_profile) {
          const suggested = d.invitee.suggested_username || (d.invitee.name_snapshot || '').toLowerCase().replace(/\s+/g, '.');
          setSetupUsername(suggested);
        }
      })
      .catch(e => setError(e.message));
  }, [token]);

  useEffect(() => {
    const aktion = data?.aktion;
    if (!aktion?.location) return;
    setWeatherLoading(true);
    fetchWeather(aktion.location, aktion.date)
      .then(w => setWeather(w))
      .catch(() => setWeather(null))
      .finally(() => setWeatherLoading(false));
  }, [data?.aktion?.location, data?.aktion?.date]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!status) {
      toast.error('Bitte wähle eine Antwort aus.');
      return;
    }

    try {
      const res = await fetch(`/api/public/invite/${token}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, comment, guests_count: guestsCount })
      });

      if (res.ok) {
        setSuccess(true);
      } else {
        const errorData = await res.json().catch(() => ({}));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Fehler beim Speichern der Antwort. Bitte versuche es später erneut.');
      }
    } catch (e: any) {
      console.error('Submission Error:', e);
      toast.error(e.message || 'Ein Netzwerkfehler ist aufgetreten.');
    }
  };

  const fetchUpdatedData = async () => {
    try {
      const res = await fetch(`/api/public/invite/${token}`);
      if (res.ok) {
        const d = await res.json();
        setChecklist(d.checklist || []);
        setPolls(d.polls || []);
        setMessages(d.messages || []);
      }
    } catch (e) {}
  };

  const handlePostMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      const res = await fetch(`/api/public/invite/${token}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: newMessage })
      });
      if (res.ok) {
        setNewMessage('');
        fetchUpdatedData();
      } else {
        throw new Error('Fehler beim Senden');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleDeleteMessage = async (msgId: number) => {
    try {
      const res = await fetch(`/api/public/invite/${token}/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchUpdatedData();
      } else {
        throw new Error('Keine Berechtigung zum Löschen');
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleClaimItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/public/invite/${token}/checklist/${itemId}/claim`, { method: 'PUT' });
      if (res.ok) {
        toast.success('Gegenstand übernommen');
        fetchUpdatedData();
      }
    } catch (e) {
      toast.error('Fehler beim Übernehmen');
    }
  };

  const handleUnclaimItem = async (itemId: number) => {
    try {
      const res = await fetch(`/api/public/invite/${token}/checklist/${itemId}/unclaim`, { method: 'PUT' });
      if (res.ok) {
        toast.success('Gegenstand freigegeben');
        fetchUpdatedData();
      }
    } catch (e) {
      toast.error('Fehler beim Freigeben');
    }
  };

  const handleVote = async (pollId: number, optionId: number) => {
    try {
      const res = await fetch(`/api/public/invite/${token}/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ option_id: optionId })
      });
      if (res.ok) {
        toast.success('Stimme gespeichert');
        fetchUpdatedData();
      }
    } catch (e) {
      toast.error('Fehler beim Abstimmen');
    }
  };

  const handleSetupProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingUp(true);
    try {
      const res = await fetch(`/api/public/invite/${token}/setup-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: setupUsername, password: setupPassword })
      });

      if (res.ok) {
        toast.success('Profil erfolgreich erstellt!');
        setShowOnboarding(true);
        // Refresh data to show profile is created
        const updatedData = { ...data };
        updatedData.invitee.has_profile = true;
        setData(updatedData);
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Fehler beim Erstellen des Profils.');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      // If the invitee is linked to an admin account, use the admin auth endpoint
      const endpoint = invitee.is_admin_account ? '/api/auth/login' : '/api/public/login';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: invitee.username || invitee.suggested_username || invitee.name_snapshot, password: loginPassword })
      });

      if (res.ok) {
        toast.success(invitee.is_admin_account ? 'Einsatzleitung verifiziert' : 'Willkommen zurück!');
        const checkRes = await fetch('/api/public/check');
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          setCurrentUser(checkData.user);
          setIsAdmin(checkData.isAdmin);
          // Show onboarding for new members (not admins)
          if (!invitee.is_admin_account) {
            setShowOnboarding(true);
          }
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || 'Login fehlgeschlagen');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-muted p-8 rounded-[2rem] border border-border text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-danger/60" />
          </div>
          <h1 className="text-xl font-bold text-text mb-2">Link ungültig</h1>
          <p className="text-sm text-text-dim mb-6">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen bg-surface flex items-center justify-center"><span className="w-6 h-6 border-2 border-text-dim/20 border-t-accent rounded-full animate-spin" /></div>;

  const { aktion, invitee } = data;
  const isDeadlinePassed = aktion?.response_deadline && new Date() > new Date(aktion.response_deadline);

  const labelMap = { wanderung: 'Wanderung', sport: 'Sport', demo: 'Demo', spontan: 'Spontan' };
  const typeLabel = labelMap[aktion?.type] || 'Einladung';
  
  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-muted p-8 rounded-[2rem] border border-border text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success/60" />
          </div>
          <h1 className="text-xl font-bold text-text mb-2">Erledigt.</h1>
          <p className="text-sm text-text-dim mb-6">Antwort übermittelt.</p>
          <div className="bg-surface-elevated p-4 rounded-xl border border-border mb-6 text-left">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Status</p>
            <div className="flex items-center gap-3">
              <span className={`w-2.5 h-2.5 rounded-full ${status === 'yes' ? 'bg-success' : status === 'no' ? 'bg-danger' : 'bg-warning'}`} />
              <span className="font-bold text-text">{status === 'yes' ? 'Dabei' : status === 'no' ? 'Abgesagt' : 'Vielleicht'}</span>
            </div>
            {guestsCount > 0 && <p className="text-xs text-text-dim mt-2">+{guestsCount} Gäste</p>}
          </div>
          <Link to="/" className="block w-full bg-accent text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 transition-all">Zur App</Link>
          <button onClick={() => setSuccess(false)} className="text-xs text-text-dim mt-4 hover:text-text">Ändern</button>
        </div>
      </div>
    );
  }

  const day1 = aktion?.date && aktion?.location
    ? (weather?.day1?.temp ? weather.day1 : null)
    : null;

  return (
    <div className="min-h-screen bg-surface pb-28">
      {isAdmin && (
        <div className="sticky top-0 z-50 px-4 pt-2">
          <Link to="/" className="inline-flex items-center gap-2 px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs text-text-dim hover:text-text transition-colors">
            <Calendar className="w-3.5 h-3.5" /> Admin
          </Link>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Event Header Card */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{typeLabel}</span>
          </div>
          <h1 className="text-xl font-bold text-text mb-1">{aktion?.title}</h1>
          {invitee?.name_snapshot && <p className="text-sm text-text-dim mb-4">Hallo {invitee.name_snapshot}</p>}

          <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
            <div>
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Zeit</p>
              <p className="text-sm font-bold text-text">{aktion?.date ? format(parseISO(aktion.date), 'EEEE, dd. MMM', { locale: de }) : '-'}</p>
              <p className="text-xs text-text-dim">{aktion?.date ? format(parseISO(aktion.date), 'HH:mm') : ''} Uhr</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Ort</p>
              <p className="text-sm font-bold text-text truncate">{aktion?.location || '-'}</p>
              {aktion?.meeting_point && <p className="text-xs text-text-dim mt-1">Treff: {aktion.meeting_point}</p>}
            </div>
          </div>

          {weather && weather.day2 && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-xl w-fit text-xs">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-text">{weather.day2.temp}°</span>
              <span className="text-text-dim">{weather.day2.condition}</span>
              {weather.day2.rainProb > 10 && <span className="text-blue-400 text-[10px]">{weather.day2.rainProb}% Regen</span>}
            </div>
          )}

          {aktion?.description && (
            <p className="text-sm text-text-dim italic mt-4 pt-4 border-t border-border">&ldquo;{aktion.description}&rdquo;</p>
          )}
        </div>

        {/* Map */}
        {aktion?.location && (
          <div className="bg-surface-muted border border-border rounded-2xl overflow-hidden">
            <div className="h-44 bg-surface-elevated">
              <MapComponent location={aktion.location} />
            </div>
            <div className="flex gap-2 p-3">
              <button onClick={() => setShowTransit(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs font-semibold text-text-dim hover:text-text active:scale-95 transition-all">
                <Train className="w-3.5 h-3.5" /> Anfahrt
              </button>
              <button onClick={() => generateVCalendar(aktion, window.location.href)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-text text-surface rounded-xl text-xs font-semibold hover:opacity-90 active:scale-95 transition-all">
                <Calendar className="w-3.5 h-3.5" /> Kalender
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {aktion?.response_deadline && !isDeadlinePassed && !invitee.status && (
          <div className="bg-danger/5 border border-danger/20 rounded-2xl">
            <Countdown deadline={aktion.response_deadline} />
          </div>
        )}

        {/* Response Form */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-text mb-4">Rückmeldung</h2>
          {isDeadlinePassed && (
            <div className="text-center text-xs text-danger/70 font-bold uppercase tracking-wider py-3 mb-4 bg-danger/5 rounded-xl border border-danger/10">Frist abgelaufen</div>
          )}
          <div className={`grid grid-cols-3 gap-2 mb-4 ${isDeadlinePassed ? 'opacity-20 pointer-events-none' : ''}`}>
            {[
              { id: 'yes', label: 'Dabei', Icon: CheckCircle },
              { id: 'no', label: 'Absagen', Icon: XCircle },
              { id: 'maybe', label: 'Vielleicht', Icon: HelpCircle }
            ].map(opt => (
              <label key={opt.id}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all ${
                  status === opt.id ? 'bg-accent text-white border-accent' : 'bg-surface-elevated border-border hover:border-accent/30'
                }`}>
                <input type="radio" name="status" value={opt.id} className="sr-only" checked={status === opt.id} onChange={() => setStatus(opt.id)} disabled={isDeadlinePassed} />
                <opt.Icon className={`w-4 h-4 ${status === opt.id ? 'text-white' : 'text-text-dim'}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wider ${status === opt.id ? 'text-white' : 'text-text-dim'}`}>{opt.label}</span>
              </label>
            ))}
          </div>

          {status === 'yes' && (
            <div className={`mb-4 ${isDeadlinePassed ? 'opacity-30' : ''}`}>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Gäste</p>
              <div className="flex gap-1.5">
                {[0,1,2,3,4].map(n => (
                  <button key={n} type="button" onClick={() => setGuestsCount(n)} disabled={isDeadlinePassed}
                    className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all ${
                      guestsCount === n ? 'bg-accent text-white border-accent' : 'bg-surface-elevated text-text-dim border-border'
                    }`}>{n === 0 ? '0' : `+${n}`}</button>
                ))}
              </div>
            </div>
          )}

          <div className={`mb-4 ${isDeadlinePassed ? 'opacity-30' : ''}`}>
            <textarea value={comment} onChange={e => setComment(e.target.value)} disabled={isDeadlinePassed}
              placeholder="Notiz..."
              className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-sm text-text placeholder:text-text-dim/30 outline-none focus:border-accent/40 transition-all resize-none min-h-[60px]" />
          </div>

          {!isDeadlinePassed && (
            <button onClick={() => handleSubmit()} disabled={!status}
              className="w-full bg-accent text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-20 transition-all active:scale-[0.98]">
              Rückmeldung senden
            </button>
          )}
        </div>

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="bg-surface-muted border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-text">Mitbringliste</h2>
              <button onClick={fetchUpdatedData} className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text">
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {checklist.map(item => {
                const isMe = item.claimer_person_id === invitee.person_id;
                const isOther = item.claimer_person_id && !isMe;
                return (
                  <div key={item.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                    isMe ? 'bg-accent/10 border-accent/30' : isOther ? 'bg-surface-elevated border-border opacity-60' : 'bg-surface-elevated border-border'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold truncate ${item.claimer_person_id ? 'text-text-dim' : 'text-text'}`}>{item.item_name}</p>
                      {item.notes && <p className="text-xs text-text-dim">{item.notes}</p>}
                      {isOther && <p className="text-[10px] text-text-dim mt-1">{item.claimer_name}</p>}
                      {isMe && <p className="text-[10px] text-accent font-semibold mt-1">&#10003; Von dir</p>}
                    </div>
                    {!item.claimer_person_id ? (
                      <button onClick={() => handleClaimItem(item.id)}
                        className="px-3 py-1.5 bg-text text-surface rounded-lg text-[10px] font-bold hover:opacity-90 active:scale-95 shrink-0">Ich!</button>
                    ) : isMe ? (
                      <button onClick={() => handleUnclaimItem(item.id)}
                        className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent hover:bg-danger/20 hover:text-danger active:scale-90 shrink-0">
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center shrink-0">
                        <Lock className="w-3.5 h-3.5 text-text-dim/30" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Polls */}
        {polls.length > 0 && polls.map(poll => (
          <div key={poll.id} className="bg-surface-muted border border-border rounded-2xl p-5">
            <h3 className="text-sm font-bold text-text mb-4">{poll.question}</h3>
            <div className="space-y-2">
              {poll.options.map(opt => {
                const voted = opt.votes?.some(v => v.id === invitee.person_id);
                const total = poll.options.reduce((a, b) => a + b.vote_count, 0);
                const pct = total > 0 ? (opt.vote_count / total) * 100 : 0;
                return (
                  <button key={opt.id} onClick={() => handleVote(poll.id, opt.id)}
                    className={`w-full relative h-10 rounded-xl overflow-hidden border transition-all ${
                      voted ? 'border-accent bg-accent/5' : 'border-border bg-surface-elevated'
                    }`}>
                    <div className="absolute inset-y-0 left-0 bg-accent/10" style={{width: pct + '%'}} />
                    <div className="relative h-full flex items-center justify-between px-4">
                      <span className={`text-xs font-bold uppercase tracking-wider ${voted ? 'text-accent' : 'text-text-dim'}`}>{opt.option_text}</span>
                      <span className="text-[10px] font-bold text-text-dim">{opt.vote_count}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {/* Pinnwand */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-text">Pinnwand</h2>
          </div>

          {messages.length === 0 ? (
            <div className="text-center py-8 text-xs text-text-dim">Noch keine Nachrichten</div>
          ) : (
            <div className="space-y-3 mb-4">
              {messages.map(msg => (
                <div key={msg.id} className={`p-4 rounded-xl border ${msg.is_admin ? 'bg-accent/5 border-accent/20' : 'bg-surface-elevated border-border'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className={`text-sm font-bold ${msg.is_admin ? 'text-accent' : 'text-text'}`}>
                        {msg.is_admin ? (aktion?.title || 'Veranstalter') : msg.person_name}
                      </span>
                      {msg.is_admin && <span className="ml-2 text-[8px] font-bold text-accent uppercase tracking-wider">Admin</span>}
                      <p className="text-[10px] text-text-dim">{format(parseISO(msg.created_at), 'dd.MM HH:mm')}</p>
                    </div>
                    {msg.person_id === invitee.person_id && (
                      <button onClick={() => handleDeleteMessage(msg.id)}
                        className="p-1.5 rounded-lg text-text-dim hover:text-danger transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-text-dim italic">&ldquo;{msg.message}&rdquo;</p>
                </div>
              ))}
            </div>
          )}

          {invitee.has_profile ? (
            <form onSubmit={handlePostMessage} className="flex gap-2">
              <textarea value={newMessage} onChange={e => setNewMessage(e.target.value)}
              placeholder="Schreib etwas..."
              className="flex-1 bg-surface-elevated border border-border rounded-xl p-3 text-sm text-text placeholder:text-text-dim/30 outline-none focus:border-accent/40 resize-none min-h-[40px]"
            />
            <button type="submit" disabled={!newMessage.trim()}
              className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center disabled:opacity-30 shrink-0 active:scale-90">
              <Send className="w-4 h-4" />
            </button>
          </form>
          ) : (
            <div className="bg-surface-elevated border border-dashed border-border rounded-xl p-4 text-center text-xs text-text-dim">
              Profil erstellen um Nachrichten zu schreiben.
            </div>
          )}
        </div>

        {/* Participants */}
        {data?.participants?.length > 0 && (
          <div className="bg-surface-muted border border-border rounded-2xl p-5">
            <h2 className="text-sm font-bold text-text mb-4">Teilnehmer ({data.participants.length})</h2>
            <div className="space-y-2">
              {data.participants.map((p, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-surface-elevated border border-border">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-sm font-semibold text-text">{p.name}</span>
                  {p.guests_count > 0 && <span className="text-xs text-text-dim">+{p.guests_count}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Profile Setup */}
        {!invitee.has_profile && (
          <div className="bg-surface-muted border border-border rounded-2xl p-5">
            <h2 className="text-sm font-bold text-text mb-2">Profil erstellen</h2>
            <p className="text-xs text-text-dim mb-4">Um Nachrichten zu schreiben und dauerhaft teilzunehmen.</p>
            <form onSubmit={handleSetupProfile} className="space-y-3">
              <input type="text" required value={setupUsername} onChange={e => setSetupUsername(e.target.value)}
                placeholder="Username" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" />
              <input type="password" required minLength={8} value={setupPassword} onChange={e => setSetupPassword(e.target.value)}
                placeholder="Passwort" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" />
              <button type="submit" disabled={isSettingUp}
                className="w-full bg-accent text-white font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-20 transition-all">
                {isSettingUp ? 'Erstelle...' : 'Profil erstellen'}
              </button>
            </form>
          </div>
        )}

        {/* Login prompt */}
        {invitee.has_profile && currentUser?.id !== invitee.person_id && (
          <div className="bg-surface-muted border border-border rounded-2xl p-5">
            <h2 className="text-sm font-bold text-text mb-2">{invitee.is_admin_account ? 'Admin' : 'Anmeldung'}</h2>
            <p className="text-xs text-text-dim mb-4">Bitte melde dich an.</p>
            <form onSubmit={handleLogin} className="space-y-3">
              <input type="password" required value={loginPassword} onChange={e => setLoginPassword(e.target.value)}
                placeholder="Passwort" className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" />
              <button type="submit" disabled={isLoggingIn}
                className="w-full bg-text text-surface font-bold py-3 rounded-xl text-sm hover:opacity-90 disabled:opacity-20 transition-all">
                {isLoggingIn ? 'Verifiziere...' : 'Einloggen'}
              </button>
            </form>
          </div>
        )}

        {/* Logged in indicator */}
        {invitee.has_profile && currentUser?.id === invitee.person_id && (
          <div className="bg-success/5 border border-success/20 rounded-2xl p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-success" />
              <div>
                <p className="text-sm font-bold text-text">Eingeloggt</p>
                <p className="text-xs text-text-dim">@{currentUser.username}</p>
              </div>
            </div>
            <Link to="/" className="px-4 py-2 bg-accent text-white rounded-xl text-xs font-bold hover:opacity-90">
              Dashboard
            </Link>
          </div>
        )}
      </div>

      <TransitPlanner isOpen={showTransit} onClose={() => setShowTransit(false)}
        destination={aktion?.location} destinationName={aktion?.location}
        eventStartTime={aktion?.date} />
      <OnboardingWizard isOpen={showOnboarding} onComplete={() => setShowOnboarding(false)} onClose={() => setShowOnboarding(false)} />
    </div>
  );
}