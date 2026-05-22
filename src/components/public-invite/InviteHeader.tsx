import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Train, Compass, Trophy, Megaphone, Zap } from 'lucide-react';
import MapComponent from '../MapComponent';
import { generateVCalendar } from '../../lib/calendar';

interface InviteHeaderProps {
  aktion: any;
  invitee: any;
  isAdmin: boolean;
  onTransit: () => void;
  getEventIcon: (type: string) => React.ReactNode;
  getEventLabel: (type: string) => string;
}

export default function InviteHeader({ aktion, invitee, isAdmin, onTransit, getEventIcon, getEventLabel }: InviteHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }} 
      animate={{ opacity: 1, scale: 1 }} 
      transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      className="relative"
    >
      <div className="premium-card rounded-4xl p-10 sm:p-20 text-center relative z-10 flex flex-col items-center shadow-none border-white/[0.08]">
        <div className="absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-white/[0.05] to-transparent pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex items-center gap-4 mb-12"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
          <span className="micro-label">{getEventLabel(aktion.type)}</span>
        </motion.div>

        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, duration: 1, ease: [0.16, 1, 0.3, 1] }}
          className="w-24 h-24 bg-white text-black rounded-3xl flex items-center justify-center mb-12 shadow-[0_32px_64px_-16px_rgba(255,255,255,0.2)] ring-1 ring-white/20 active:scale-95 transition-transform"
        >
          {getEventIcon(aktion.type)}
        </motion.div>

        <h1 className="text-6xl sm:text-8xl font-serif font-black text-white tracking-tighter leading-[0.85] mb-12">
          {aktion?.title}
        </h1>

        <div className="h-px w-24 bg-white/10 mb-12" />

        <div className="space-y-6">
          <h2 className="text-white/40 font-serif italic text-4xl sm:text-5xl tracking-[-0.04em] leading-none">
            Grüß dich {invitee?.name_snapshot || invitee?.name},
          </h2>
          <p className="text-white font-display font-medium text-2xl sm:text-3xl uppercase tracking-[0.2em] leading-[1.1] max-w-lg">
            Es ist an Zeit Stärke für <br />
            <span className="text-white/50 italic font-serif lowercase tracking-tighter pr-3 text-3xl sm:text-4xl">die</span> 
            Heimat zu zeigen.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-16 w-full text-left mt-24">
          <div className="space-y-6">
            <span className="micro-label">Zeitplan</span>
            <div className="space-y-2">
              <div className="text-white font-serif text-3xl font-bold tracking-tight leading-none group-hover:text-white/80 transition-colors cursor-default">
                {aktion?.date ? format(parseISO(aktion.date), 'EEEE, dd. MMM', { locale: de }) : '-'}
              </div>
              <div className="text-white/30 text-xl font-medium italic">{aktion?.date ? format(parseISO(aktion.date), 'HH:mm', { locale: de }) : '-'} Uhr</div>
            </div>
          </div>
          
          <div className="space-y-6">
            <span className="micro-label">Standort</span>
            <div className="space-y-3">
              <div className="text-white font-serif text-3xl font-bold tracking-tight leading-tight group-hover:text-white/80 transition-colors cursor-default">
                {aktion?.location}
              </div>
              {aktion?.meeting_point && (
                <div className="inline-block px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest text-white/30">
                  Treffpunkt: {aktion.meeting_point}
                </div>
              )}
            </div>
          </div>
        </div>

        {aktion?.location && (
          <div className="w-full mt-24 relative group">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl h-80 relative"
            >
              <MapComponent location={aktion.location} />
              <div className="absolute inset-0 bg-black/20 pointer-events-none group-hover:opacity-0 transition-opacity duration-700" />
              <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/80 via-black/40 to-transparent flex flex-wrap justify-end gap-3 z-20">
                <button 
                  onClick={(e) => { e.stopPropagation(); onTransit(); }}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-3xl border border-white/20 px-6 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-white transition-all active:scale-95 shadow-2xl"
                >
                  <Train className="w-4 h-4" /> Route
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); generateVCalendar(aktion, window.location.href); }}
                  className="bg-white text-black px-8 py-3 rounded-2xl flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_20px_40px_rgba(255,255,255,0.2)]"
                >
                  <Calendar className="w-4 h-4" /> Exportieren
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {aktion?.description && (
          <div className="w-full mt-24 text-left space-y-8 pt-20 border-t border-white/5 relative">
             <span className="micro-label absolute top-10 left-0">Hinweise</span>
             <p className="text-white/50 text-2xl whitespace-pre-wrap leading-[1.4] font-medium tracking-tighter italic font-serif">
               "{aktion.description}"
             </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
