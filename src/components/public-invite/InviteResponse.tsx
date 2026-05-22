import React, { useState, useEffect } from 'react';
import { format, parseISO, differenceInSeconds } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';
import { CheckCircle, XCircle, HelpCircle, Users } from 'lucide-react';

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
        <span className="micro-label !text-red-400/60 uppercase tracking-[0.3em]">Antwort ausstehend</span>
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

interface InviteResponseProps {
  aktion: any;
  invitee: any;
  status: string;
  setStatus: (s: string) => void;
  comment: string;
  setComment: (s: string) => void;
  guestsCount: number;
  setGuestsCount: (n: number) => void;
  handleSubmit: (e: React.FormEvent) => void;
  isDeadlinePassed: boolean;
}

export default function InviteResponse({
  aktion,
  invitee,
  status,
  setStatus,
  comment,
  setComment,
  guestsCount,
  setGuestsCount,
  handleSubmit,
  isDeadlinePassed
}: InviteResponseProps) {
  return (
    <div className="space-y-12">
      {aktion?.response_deadline && !isDeadlinePassed && !invitee.status && (
        <Countdown deadline={aktion.response_deadline} />
      )}

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="glass rounded-3xl p-8 border border-white/5 relative overflow-hidden"
      >
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        <form onSubmit={handleSubmit} className="relative z-10">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-4xl font-serif font-bold text-white tracking-tighter">Rückmeldung</h2>
            <div className="flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="micro-label !text-emerald-500/60">Live Rückmeldung</span>
            </div>
          </div>
          
          {isDeadlinePassed && (
            <div className="bg-red-500/5 text-red-400/80 border border-red-500/10 p-8 rounded-3xl mb-12 text-[10px] font-black uppercase tracking-[0.3em] text-center shadow-inner italic">
              Abstimmungsfrist abgelaufen.
            </div>
          )}

          <div className={`grid grid-cols-1 sm:grid-cols-3 gap-6 mb-16 ${isDeadlinePassed ? 'opacity-20 pointer-events-none grayscale' : ''}`}>
            {[
              { id: 'yes', label: 'Einsatzbereit', icon: CheckCircle, color: 'emerald' },
              { id: 'no', label: 'Abwesend', icon: XCircle, color: 'rose' },
              { id: 'maybe', label: 'Unklar', icon: HelpCircle, color: 'amber' }
            ].map((opt) => (
              <motion.label 
                key={opt.id}
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                className={`
                  cursor-pointer border rounded-3xl p-8 text-center transition-all relative overflow-hidden group
                  ${status === opt.id 
                    ? `bg-white text-black border-white shadow-[0_24px_48px_rgba(255,255,255,0.2)]` 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'}
                `}
              >
                <input type="radio" name="status" value={opt.id} className="sr-only" checked={status === opt.id} onChange={() => setStatus(opt.id)} disabled={isDeadlinePassed} />
                <div className="relative z-10 flex flex-col items-center">
                  <opt.icon className={`w-10 h-10 mb-4 transition-all duration-700 ${status === opt.id ? `text-black scale-110` : 'text-white/10 group-hover:text-white/30'}`} />
                  <span className={`text-[10px] font-black uppercase tracking-[0.25em] transition-colors ${status === opt.id ? 'text-black' : 'text-white/20'}`}>
                    {opt.label}
                  </span>
                </div>
              </motion.label>
            ))}
          </div>

          <AnimatePresence>
            {status === 'yes' && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: 'auto' }} 
                exit={{ opacity: 0, height: 0 }}
                className={`mb-8 overflow-hidden ${isDeadlinePassed ? 'opacity-30' : ''}`}
              >
                <label className="flex items-center gap-3 text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 pl-1">
                  <Users className="w-4 h-4" /> Gäste
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[0, 1, 2, 3, 4].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setGuestsCount(num)}
                      disabled={isDeadlinePassed}
                      className={`py-4 rounded-xl font-black text-xs transition-all border ${
                        guestsCount === num 
                        ? 'bg-white text-black border-white shadow-xl scale-105' 
                        : 'bg-black/40 text-white/20 border-white/5 hover:border-white/10'
                      }`}
                    >
                      {num === 0 ? '0' : `+${num}`}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className={`mb-10 ${isDeadlinePassed ? 'opacity-30' : ''}`}>
            <label className="block text-[9px] font-black text-white/20 uppercase tracking-[0.2em] mb-4 pl-1">
              Anmerkung
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Hast du noch etwas mitzuteilen?..."
              className="w-full bg-black/50 border border-white/5 rounded-2xl p-5 text-white/80 focus:outline-none focus:ring-1 focus:ring-white/10 transition-all font-medium placeholder:text-white/10 text-base leading-relaxed min-h-[120px]"
              disabled={isDeadlinePassed}
            />
          </div>

          {!isDeadlinePassed && (
            <motion.button 
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              className="w-full bg-white text-black font-black py-5 rounded-2xl shadow-2xl text-[10px] uppercase tracking-[0.3em] transition-all hover:bg-white/90 active:scale-[0.98]"
            >
              Abstimmung senden
            </motion.button>
          )}
        </form>
      </motion.div>
    </div>
  );
}
