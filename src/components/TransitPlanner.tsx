import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Train, Bus, TramFront as Tram, Footprints as Walk,
  MapPin, Clock, ArrowRight, X, Loader2, Navigation,
  AlertCircle, Search, ExternalLink, Home, Share, Sun, CloudRain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addHours } from 'date-fns';
import { fetchTransitConnections } from '../services/transitService';
import { processConnections, EnrichedConnection } from '../services/transitIntelligence';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  destinationName: string;
  eventStartTime?: string;
}

export default function TransitPlanner({ isOpen, onClose, destination, destinationName, eventStartTime }: Props) {
  const [startPoint, setStartPoint] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [departureTime, setDepartureTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tripMode, setTripMode] = useState<'outbound' | 'return'>('outbound');
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<EnrichedConnection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (useCurrentLocation && !startPoint) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => setStartPoint(pos.coords.latitude + ',' + pos.coords.longitude),
        () => { setUseCurrentLocation(false); setLoading(false); },
        { timeout: 8000 }
      );
    }
  }, [isOpen]);

  // Weather
  useEffect(() => {
    if (!isOpen || !destination) return;
    const fetchWeather = async () => {
      try {
        const parts = destination.split(',');
        const city = parts[parts.length - 1].replace(/[0-9]/g, '').trim() || destinationName;
        const geo = await (await fetch('https://geocoding-api.open-meteo.com/v1/search?name='+encodeURIComponent(city)+'&count=1&language=de')).json();
        if (!geo.results?.[0]) return;
        const { latitude, longitude, timezone } = geo.results[0];
        const wx = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude='+latitude+'&longitude='+longitude+'&current_weather=true&timezone='+(timezone||'Europe/Berlin'))).json();
        if (wx.current_weather) setWeather(wx.current_weather);
      } catch {}
    };
    fetchWeather();
  }, [isOpen, destination, destinationName]);

  const getIcon = useMemo(() => (mode: string) => {
    if (mode==='train') return <Train className="w-3.5 h-3.5" />;
    if (mode==='tram') return <Tram className="w-3.5 h-3.5" />;
    if (mode==='walk') return <Walk className="w-3.5 h-3.5" />;
    return <Bus className="w-3.5 h-3.5" />;
  }, []);

  const findRoutes = useCallback(async (start: string, mode: 'outbound'|'return' = tripMode) => {
    if (!destination) { setError('Kein Ziel'); return; }
    setLoading(true); setError(null); setHasSearched(true);
    let searchDate: string|undefined, isArr = false;
    if (departureTime) { searchDate = departureTime; }
    else if (eventStartTime && mode === 'outbound') { searchDate = eventStartTime; isArr = true; }
    else if (eventStartTime) { searchDate = addHours(parseISO(eventStartTime), 3).toISOString(); }
    const from = mode === 'outbound' ? start : destination;
    const to = mode === 'outbound' ? destination : start;
    try {
      const routes = await fetchTransitConnections(from, to, searchDate, isArr);
      if (!routes.length) { setError('Keine Verbindung'); setLoading(false); return; }
      if (eventStartTime && mode === 'outbound') {
        const result = await processConnections(
          { location: destinationName, startTime: eventStartTime, type: 'party' },
          { from: start, preferences: { priority: 'balanced' } }, routes
        );
        setConnections(result.connections);
      } else {
        setConnections(routes.slice(0,5).map(r => ({
          ...r, recommendationScore: 50, urgency: 'safe' as const,
          confidence: 'medium' as const, tags: [], summary: ''
        })));
      }
    } catch { setError('Fehler bei Routensuche'); }
    finally { setLoading(false); }
  }, [destination, destinationName, eventStartTime, departureTime, tripMode]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); if (startPoint) findRoutes(startPoint); };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={onClose} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <motion.div initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
            transition={{ type:'spring', damping:30, stiffness:300 }}
            className="relative w-full sm:max-w-lg bg-[#0a0a0b] sm:border border-t border-white/10 rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col max-h-[90vh]">

            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-3 sm:px-7 sm:pt-7 border-b border-white/5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-white/5 rounded-xl flex items-center justify-center">
                    <Train className="w-4 h-4 text-white/40" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Route</h2>
                    <p className="text-[8px] text-white/20 uppercase tracking-widest font-bold">Nahverkehr</p>
                  </div>
                  {weather && (
                    <div className="flex items-center gap-1 bg-white/5 border border-white/10 rounded-lg px-2 py-0.5">
                      {weather.code <= 3 ? <Sun className="w-3 h-3 text-emerald-400" /> : <CloudRain className="w-3 h-3 text-blue-400" />}
                      <span className="text-xs font-bold text-white">{Math.round(weather.temperature)}°</span>
                    </div>
                  )}
                </div>
                <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-white/30 hover:text-white active:scale-90">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/5">
                <button onClick={() => setTripMode('outbound')}
                  className={'flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all '+ (tripMode==='outbound'?'bg-white/10 text-white':'text-white/40')}>
                  <ArrowRight className="w-3 h-3 inline mr-1" /> Hin
                </button>
                <button onClick={() => setTripMode('return')}
                  className={'flex-1 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all '+ (tripMode==='return'?'bg-white/10 text-white':'text-white/40')}>
                  <ArrowRight className="w-3 h-3 inline mr-1 rotate-180" /> Rück
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-7 space-y-4 pb-6">

              {/* Ziel */}
              <div className="flex items-center gap-3 p-3 bg-white/[0.03] rounded-xl border border-white/5">
                <span className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                </span>
                <p className="text-sm font-bold text-white truncate">{destinationName}</p>
              </div>

              {/* Suche */}
              <form onSubmit={handleSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <input type="text"
                    placeholder={tripMode==='outbound'?'Startort...':'Zielort...'}
                    value={startPoint} onChange={e => { setStartPoint(e.target.value); setUseCurrentLocation(false); }}
                    className="w-full h-11 bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 text-sm text-white placeholder:text-white/20 outline-none focus:border-white/20" />
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                </div>
                <button type="submit" className="h-11 px-5 bg-white text-black text-sm font-bold rounded-xl hover:bg-white/90 active:scale-95 shrink-0">
                  Los
                </button>
              </form>

              {/* Quick actions row */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => {
                  navigator.geolocation.getCurrentPosition(
                    p => findRoutes(p.coords.latitude+','+p.coords.longitude),
                    () => toast.error('Standort nicht verfügbar'), {timeout:8000}
                  );
                }} className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest text-emerald-400 active:scale-95">
                  <Navigation className="w-3 h-3" /> Live
                </button>
                <button onClick={() => setShowTimePicker(!showTimePicker)}
                  className={'flex items-center gap-1.5 border px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest active:scale-95 '+
                    (departureTime?'bg-accent/10 border-accent/20 text-accent':'bg-white/5 border-white/5 text-white/40')}>
                  <Clock className="w-3 h-3" /> {departureTime?format(parseISO(departureTime),'dd.MM HH:mm'):'Zeit'}
                </button>
              </div>

              {showTimePicker && (
                <div className="flex gap-2">
                  <input type="datetime-local" value={departureTime}
                    onChange={e => { setDepartureTime(e.target.value); findRoutes(startPoint); }}
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2.5 px-3 text-white text-xs outline-none [color-scheme:dark]" />
                  {departureTime && <button onClick={() => { setDepartureTime(''); findRoutes(startPoint); }}
                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[8px] font-black text-white/40">Jetzt</button>}
                </div>
              )}

              {/* Loading */}
              {loading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
                </div>
              )}

              {/* Error */}
              {error && !loading && (
                <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl text-center">
                  <AlertCircle className="w-6 h-6 text-red-500/30 mx-auto mb-2" />
                  <p className="text-xs text-white/50">{error}</p>
                </div>
              )}

              {/* Connections */}
              {connections.length > 0 && !loading && (
                <div className="space-y-2">
                  <p className="text-[8px] font-black text-white/20 uppercase tracking-widest text-center pt-2">Verbindungen</p>
                  {connections.slice(0,5).map((conn, i) => {
                    const dep = format(parseISO(conn.departure), 'HH:mm');
                    const arr = format(parseISO(conn.arrival), 'HH:mm');
                    return (
                      <div key={conn.id||i}
                        className={'p-3 bg-white/5 border rounded-xl flex items-center gap-3 transition-all ' +
                          (i===0?'border-emerald-500/30 bg-emerald-500/5':'border-white/10')}>
                        <div className="w-10 shrink-0 flex flex-col items-center">
                          <span className="text-sm font-bold text-white leading-none">{dep}</span>
                          <span className="text-[9px] text-white/40 leading-none mt-0.5">{arr}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-[9px] text-white/50 font-bold uppercase">
                            <span>{conn.duration} Min</span>
                            <span>&middot;</span>
                            <span>{conn.transfers} Umstieg{conn.transfers!==1?'e':''}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {conn.legs.slice(0,4).map((l, j) => (
                              <span key={j} className="flex items-center gap-0.5 bg-white/10 px-1.5 py-0.5 rounded text-[8px] font-bold text-white/70 uppercase">
                                {getIcon(l.mode)} {l.line||''}
                              </span>
                            ))}
                          </div>
                        </div>
                        <button onClick={() => {
                          const txt = 'Ich fahre um '+dep+' Uhr zu '+destinationName;
                          if (navigator.share) navigator.share({text: txt});
                          else { navigator.clipboard.writeText(txt); toast('Route kopiert'); }
                        }} className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-white/30 hover:text-white shrink-0">
                          <Share className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Google Maps */}
              {hasSearched && (
                <a href={'https://www.google.com/maps/dir/?api=1&destination='+encodeURIComponent(destination)+'&travelmode=transit'}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl transition-all active:scale-[0.98]">
                  <Navigation className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm font-bold text-white">In Google Maps öffnen</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400/50" />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
