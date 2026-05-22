import React from 'react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, MapPin, Clock, Edit2, Train, Compass, Trophy, Megaphone, Zap, Sun, Cloud, CloudRain, Wind, Thermometer } from 'lucide-react';
import { generateVCalendar } from '../../lib/calendar';
import MapComponent from '../MapComponent';

interface EventHeaderProps {
  aktion: any;
  onEdit: () => void;
  onTransit: () => void;
  getEventIcon: (type: string) => React.ReactNode;
  getEventLabel: (type: string) => string;
}

export default function EventHeader({ aktion, onEdit, onTransit, getEventIcon, getEventLabel }: EventHeaderProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface-muted rounded-[3rem] border border-white/5 overflow-hidden mb-12 relative shadow-2xl"
    >
      <div className="h-40 sm:h-56 bg-gradient-to-br from-white/[0.05] to-transparent relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.05)_0%,transparent_70%)]" />
        <div className="absolute top-6 right-6">
          <button 
            onClick={onEdit}
            className="w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl flex items-center justify-center text-white/60 hover:text-white transition-all active:scale-90"
            title="Aktion bearbeiten"
          >
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="px-6 pb-10 sm:px-12 sm:pb-14 -mt-12 sm:-mt-16 relative z-10">
        <div className="flex flex-col gap-8">
          <div className="flex-1 space-y-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 sm:w-32 sm:h-32 bg-surface-elevated rounded-[2rem] shadow-2xl border border-white/10 flex items-center justify-center overflow-hidden backdrop-blur-2xl ring-8 ring-black/20 shrink-0">
                <div className="bg-white/5 w-full h-full flex flex-col items-center justify-center text-white">
                  <span className="text-[10px] sm:text-xs font-black uppercase text-white/20 tracking-[0.3em] mb-1">{aktion?.date ? format(parseISO(aktion.date), 'MMM', { locale: de }) : '-'}</span>
                  <span className="text-4xl sm:text-5xl font-serif font-bold leading-none tracking-tighter">{aktion?.date ? format(parseISO(aktion.date), 'dd') : '-'}</span>
                </div>
              </div>
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white shadow-2xl rounded-2xl flex items-center justify-center text-black shrink-0">
                {getEventIcon(aktion.type)}
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)] animate-pulse" />
                <span className="micro-label !text-white/40">{getEventLabel(aktion.type)}</span>
              </div>
              <h1 className="text-4xl sm:text-6xl font-serif font-bold text-white tracking-tighter leading-[0.9]">{aktion?.title || '-'}</h1>
              <div className="flex flex-wrap gap-2 pt-2">
                <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 text-white/50 text-xs font-bold uppercase tracking-widest">
                  <Clock className="w-3.5 h-3.5" /> 
                  {aktion?.date ? format(parseISO(aktion.date), 'HH:mm', { locale: de }) : '-'} Uhr
                </div>
                <div className="flex items-center gap-2.5 bg-white/5 px-4 py-2.5 rounded-xl border border-white/5 text-white/50 text-xs font-bold uppercase tracking-widest">
                  <MapPin className="w-3.5 h-3.5" /> 
                  {aktion?.location || '-'}
                </div>
                {aktion?.meeting_point && (
                  <div className="flex items-center gap-2.5 bg-white text-black px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-white/5">
                    Treffpunkt: {aktion.meeting_point}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        {aktion.description && (
          <div className="mt-12 p-8 bg-black/20 rounded-[2.5rem] border border-white/5 text-white/40 text-base sm:text-lg leading-relaxed font-medium">
            {aktion.description}
          </div>
        )}
        
        <div className="mt-8 flex flex-wrap justify-center sm:justify-start gap-4">
          <button 
            onClick={onTransit}
            className="bg-white/5 hover:bg-white/10 backdrop-blur-xl border border-white/10 px-8 py-5 rounded-[1.8rem] flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] text-white transition-all active:scale-95 shadow-2xl"
          >
            <Train className="w-5 h-5" /> Route planen
          </button>
          <button 
            onClick={() => generateVCalendar(aktion, `${window.location.origin}/invite/${aktion.token}`)}
            className="bg-white text-black px-8 py-5 rounded-[1.8rem] flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-white/10"
          >
            <Calendar className="w-5 h-5" /> Kalender
          </button>
        </div>
      </div>
    </motion.div>
  );
}

interface EventOverviewProps {
  aktion: any;
  weather: any;
  weatherLoading: boolean;
  getWeatherInfo: (code: number) => { label: string; icon: any; color: string };
}

export function EventOverview({ aktion, weather, weatherLoading, getWeatherInfo }: EventOverviewProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-10">
        {/* Weather Card */}
        <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-[3rem] p-8 sm:p-10 border border-blue-500/20 shadow-2xl relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 flex flex-col gap-8">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-[10px] font-black text-blue-400/80 uppercase tracking-[0.4em] mb-2">Vorhersage</h3>
                <div className="text-2xl font-serif font-bold text-white tracking-tight">{aktion?.location || 'Ort unbekannt'}</div>
              </div>
              <div className="w-14 h-14 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_30px_rgba(59,130,246,0.3)] border border-blue-500/20">
                {weather ? (
                  (() => {
                    const Info = getWeatherInfo(weather.code);
                    return <Info.icon className={`w-7 h-7 ${Info.color}`} />;
                  })()
                ) : (
                  <Sun className="w-7 h-7 text-white/20" />
                )}
              </div>
            </div>

            {weatherLoading ? (
              <div className="h-20 flex items-center gap-4">
                <div className="w-16 h-12 bg-white/5 rounded-2xl animate-pulse" />
                <div className="w-32 h-6 bg-white/5 rounded-lg animate-pulse" />
              </div>
            ) : weather ? (
              <div className="flex items-end gap-4">
                <div className="text-6xl sm:text-7xl font-sans font-bold text-white tracking-tighter leading-none">
                  {weather.current !== null ? `${weather.current}°` : `${weather.temp}°`}
                </div>
                <div className="text-lg text-blue-200/60 font-medium mb-1">
                  {getWeatherInfo(weather.code).label}
                </div>
              </div>
            ) : (
              <div className="text-white/20 text-sm font-bold uppercase tracking-widest py-4">
                Keine Wetterdaten verfügbar
              </div>
            )}

            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-blue-500/10">
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase text-blue-200/40 tracking-widest flex items-center"><CloudRain className="w-3 h-3 mr-1" /> Regen</span>
                <span className="text-sm font-bold text-white">{weather ? `${weather.rainProb}%` : '--'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase text-blue-200/40 tracking-widest flex items-center"><Wind className="w-3 h-3 mr-1" /> Min</span>
                <span className="text-sm font-bold text-white">{weather ? `${weather.tempMin}°` : '--'}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[9px] font-black uppercase text-blue-200/40 tracking-widest flex items-center"><Thermometer className="w-3 h-3 mr-1" /> Max</span>
                <span className="text-sm font-bold text-white">{weather ? `${weather.temp}°` : '--'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Info Card */}
        <div className="bg-surface-muted rounded-[3rem] p-8 sm:p-10 border border-white/5 shadow-2xl space-y-10">
          <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Details</h3>
          <div className="space-y-8">
            <div className="flex gap-6 items-center">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5">
                <Calendar className="w-5 h-5 text-white/20" />
              </div>
              <div>
                <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Erstellt</div>
                <div className="text-lg font-serif font-bold text-white tracking-tight">{aktion?.created_at ? format(parseISO(aktion.created_at), 'dd.MM.yyyy') : '-'}</div>
              </div>
            </div>
            {aktion?.response_deadline && (
              <div className="flex gap-6 items-center">
                <div className="w-12 h-12 bg-red-500/5 rounded-2xl flex items-center justify-center shrink-0 border border-red-500/10">
                  <Clock className="w-5 h-5 text-red-400/30" />
                </div>
                <div>
                  <div className="text-[10px] font-black text-red-500/30 uppercase tracking-widest mb-1">Deadline</div>
                  <div className="text-lg font-serif font-bold text-white tracking-tight">{format(parseISO(aktion.response_deadline), 'dd.MM. HH:mm')}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Action Map */}
        {aktion?.location && (
          <div className="bg-surface-muted rounded-[2.5rem] p-2 border border-white/5 shadow-2xl overflow-hidden group">
            <div className="rounded-[2.2rem] overflow-hidden grayscale contrast-[1.2] invert brightness-[0.8] opacity-60 group-hover:opacity-100 transition-opacity">
              <MapComponent location={aktion.location} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
