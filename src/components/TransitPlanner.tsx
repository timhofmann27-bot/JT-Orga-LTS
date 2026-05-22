import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Train, Bus, TramFront as Tram, Footprints as Walk,
  MapPin, Clock, ArrowRight, X, Loader2, Navigation,
  ChevronRight, AlertCircle, Search, ExternalLink, Zap, Shield, Repeat, Home, Share, CloudRain, Sun, Cloud
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, addHours } from 'date-fns';
import { de } from 'date-fns/locale';
import { fetchTransitConnections } from '../services/transitService';
import { processConnections, EnrichedConnection, IntelligenceResult } from '../services/transitIntelligence';
import toast from 'react-hot-toast';

interface TransitPlannerProps {
  isOpen: boolean;
  onClose: () => void;
  destination: string;
  destinationName: string;
  eventStartTime?: string;
}

export default function TransitPlanner({
  isOpen, onClose, destination, destinationName, eventStartTime
}: TransitPlannerProps) {
  const [startPoint, setStartPoint] = useState('');
  const [useCurrentLocation, setUseCurrentLocation] = useState(true);
  const [departureTime, setDepartureTime] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);
  
  // New State variables for specific features
  const [tripMode, setTripMode] = useState<'outbound' | 'return'>('outbound');
  const [homeAddress, setHomeAddress] = useState<string>('');
  const [weather, setWeather] = useState<{ temp: number, text: string, code: number } | null>(null);

  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<EnrichedConnection[]>([]);
  const [meta, setMeta] = useState<IntelligenceResult['meta'] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize Home Address
  useEffect(() => {
    const saved = localStorage.getItem('transit_home_address');
    if (saved) setHomeAddress(saved);
  }, []);

  const handleSaveHome = () => {
    if (!startPoint || startPoint === 'Aktueller Standort') return;
    localStorage.setItem('transit_home_address', startPoint);
    setHomeAddress(startPoint);
    toast.success('Als Zuhause gespeichert!');
  };

  const handleLoadHome = () => {
    if (homeAddress) {
      setUseCurrentLocation(false);
      setStartPoint(homeAddress);
    }
  };

  // Weather Fetcher
  useEffect(() => {
    if (!isOpen || !destination) return;
    
    // Open-Meteo Geocoding needs just a city name, not a full address like "Club XY, Berlin 10243"
    // We isolate the city from the destination string by taking the last part and stripping numbers/zips
    const locationParts = destination.split(',');
    const rawCity = locationParts[locationParts.length - 1];
    const queryCity = rawCity.replace(/[0-9]/g, '').trim() || destinationName;

    const fetchWeather = async () => {
      try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=1&language=de`);
        const geoData = await geoRes.json();
        
        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude, timezone } = geoData.results[0];
          const tz = timezone || 'Europe/Berlin';
          
          // Request hourly + current weather as fallback. Add forecast_days=14 to ensure we have data.
          const wxRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&hourly=temperature_2m,weathercode&current_weather=true&timezone=${tz}&forecast_days=14`);
          const wxData = await wxRes.json();
          
          let temp = wxData.current_weather?.temperature;
          let code = wxData.current_weather?.weathercode;

          if (eventStartTime && wxData.hourly) {
            const eventDate = parseISO(eventStartTime);
            // Reconstruct the exact format the API returns: "YYYY-MM-DDTHH:00"
            const hourString = format(eventDate, "yyyy-MM-dd'T'HH:00");
            const idx = wxData.hourly.time.indexOf(hourString);
            
            if (idx !== -1) {
              temp = wxData.hourly.temperature_2m[idx];
              code = wxData.hourly.weathercode[idx];
            }
          }
          
          if (temp !== undefined && code !== undefined) {
            let text = 'Wolkig';
            if (code <= 3) text = 'Klar bis heiter';
            if (code >= 45 && code <= 48) text = 'Nebel';
            if (code >= 51 && code <= 67) text = 'Regen';
            if (code >= 71 && code <= 77) text = 'Schnee';
            if (code >= 95) text = 'Gewitter';

            setWeather({ temp, text, code });
          }
        }
      } catch (e) {
        console.error('Weather fetch failed', e);
      }
    };
    fetchWeather();
  }, [isOpen, destination, destinationName, eventStartTime]);

  const handleShareRoute = async (conn: EnrichedConnection) => {
    const depTime = format(parseISO(conn.departure), 'HH:mm');
    const arrTime = format(parseISO(conn.arrival), 'HH:mm');
    const modes = conn.legs.map((l: any) => l.line || l.mode).join(', ');
    
    const text = `Ich fahre um ${depTime} Uhr los und bin um ${arrTime} Uhr in ${destinationName}.\nRoute: ${modes}\nWir sehen uns!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meine Route',
          text: text,
        });
      } catch (err) {
        console.info('Share cancelled or failed');
      }
    } else {
      navigator.clipboard.writeText(text);
      toast.success('Route kopiert!');
    }
  };

  // Memoized icon getter — no need to recreate on every render
  const getIcon = useMemo(() => (mode: string) => {
    switch (mode) {
      case 'train': return <Train className="w-4 h-4" />;
      case 'bus': return <Bus className="w-4 h-4" />;
      case 'walk': return <Walk className="w-4 h-4" />;
      case 'tram': return <Tram className="w-4 h-4" />;
      case 'subway': return <Train className="w-4 h-4 text-emerald-400" />;
      default: return <Bus className="w-4 h-4" />;
    }
  }, []);

  const findRoutes = useCallback(async (start: string, currentTripMode: 'outbound' | 'return' = tripMode, signal?: AbortSignal) => {
    if (!destination) {
      setError('Zielort nicht definiert. Bitte wähle eine Aktion aus.');
      return;
    }
    setLoading(true);
    setError(null);

    let searchDate: string | undefined;
    let isArr = false;

    if (departureTime) {
      // Create a datetime using the selected time, on the day of the event or today
      try {
        const baseDate = eventStartTime ? parseISO(eventStartTime) : new Date();
        const [hours, minutes] = departureTime.split(':').map(Number);
        baseDate.setHours(hours, minutes, 0, 0);
        searchDate = baseDate.toISOString();
      } catch (e) {}
    } else if (eventStartTime) {
      if (currentTripMode === 'outbound') {
        searchDate = eventStartTime;
        isArr = true; // Arrive by event time
      } else {
        // Return trip default time: assume event is ~3 hours long, look for departures after that
        searchDate = addHours(parseISO(eventStartTime), 3).toISOString();
        isArr = false; // Depart after event
      }
    }

    const actualFrom = currentTripMode === 'outbound' ? start : destination;
    const actualTo = currentTripMode === 'outbound' ? destination : start;

    // Cache logic: try to load from localStorage first for immediate feedback
    const cacheKey = `transit_cache_${actualFrom}_${actualTo}_${searchDate || 'now'}_${isArr?'arr':'dep'}`;
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        setConnections(JSON.parse(cached));
        setLoading(false); // Quick feedback
      } catch (e) {
        console.error('Failed to parse cache', e);
      }
    }

    try {
      const routes = await fetchTransitConnections(actualFrom, actualTo, searchDate, isArr, signal);
      if (signal?.aborted) return;

      if (routes.length === 0) {
        setError('Keine Verbindung gefunden. Probiere einen anderen Zeitpunkt oder Zielpunkt.');
        setLoading(false);
        return;
      }

      let processedConnections: EnrichedConnection[] = [];

      if (eventStartTime && currentTripMode === 'outbound') {
        const intelligence = await processConnections(
          { location: destinationName, startTime: eventStartTime, type: 'party' },
          { from: start, preferences: { priority: 'balanced', behavior: 'balanced' } },
          routes
        );
        if (signal?.aborted) return;
        processedConnections = intelligence.connections;
        setMeta(intelligence.meta);
        if (intelligence.connections.length === 0 && intelligence.meta.warnings.length > 0) {
          setError(intelligence.meta.warnings[0]);
        }
      } else {
        // For return trips or no specific event time, just show standard connections without stress analysis
        processedConnections = routes.map(r => ({
          ...r,
          recommendationScore: 100, // simple sorting score
          urgency: 'safe',
          confidence: 'high',
          tags: currentTripMode === 'return' ? ['Rückfahrt'] : [],
          summary: 'Reguläre Verbindung.'
        }));
        setMeta(null); // No stress-meta for return
      }

      setConnections(processedConnections);
      // Cache the processed results
      localStorage.setItem(cacheKey, JSON.stringify(processedConnections));
      
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return;
      // If we don't have cached data and fetch fails, show error
      if (!cached) {
        setError('Fehler bei der Routenberechnung. Bitte später erneut versuchen.');
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [destination, destinationName, eventStartTime, departureTime, tripMode]);

  const handleGetCurrentLocation = useCallback((signal?: AbortSignal, currentTripMode: 'outbound' | 'return' = tripMode) => {
    setLoading(true);
    if (!navigator.geolocation) {
      toast.error('Geolocation wird von deinem Browser nicht unterstützt');
      setUseCurrentLocation(false);
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (signal?.aborted) return;
        const start = `${pos.coords.latitude},${pos.coords.longitude}`;
        setStartPoint('Aktueller Standort');
        findRoutes(start, currentTripMode, signal);
      },
      (err) => {
        if (signal?.aborted) return;
        console.error('Geolocation error:', err);
        const msg = err.code === 1 ? 'Standortzugriff verweigert' : 'Standort konnte nicht ermittelt werden';
        toast.error(msg);
        setUseCurrentLocation(false);
        setLoading(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  }, [findRoutes, tripMode]);

  // AbortController cleanup prevents race conditions on rapid open/close
  useEffect(() => {
    if (!isOpen) {
      setConnections([]);
      setError(null);
      setDepartureTime('');
      setShowTimePicker(false);
      setTripMode('outbound');
      return;
    }
    const controller = new AbortController();
    if (useCurrentLocation) {
      handleGetCurrentLocation(controller.signal, tripMode);
    } else if (startPoint) {
      findRoutes(startPoint, tripMode, controller.signal);
    }
    return () => controller.abort();
  }, [isOpen, destination, tripMode]); // Added tripMode to dependencies

  const getOfficialLinks = useCallback((arrivalMode = false) => {
    const isCurrentLoc = startPoint === 'Aktueller Standort';
    const start = isCurrentLoc ? '' : startPoint;
    const encodedDest = encodeURIComponent(destination);

    // Maps URL only
    const gmapsStart = isCurrentLoc ? 'current location' : encodeURIComponent(start);
    
    const finalOrigin = tripMode === 'outbound' ? gmapsStart : encodedDest;
    const finalDest = tripMode === 'outbound' ? encodedDest : gmapsStart;

    let gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${finalOrigin}&destination=${finalDest}&travelmode=transit`;

    if (eventStartTime) {
      try {
        const date = parseISO(eventStartTime);
        
        if (tripMode === 'outbound' && arrivalMode) {
          // Maps uses UNIX timestamp for arrival
          const arrivalTimeValue = Math.floor(date.getTime() / 1000);
          gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${finalOrigin}&destination=${finalDest}&travelmode=transit&arrival_time=${arrivalTimeValue}`;
        } else if (tripMode === 'return') {
          // Add roughly 3.5 hours for the return departure time
          const depDate = addHours(date, 3.5);
          const depTimeValue = Math.floor(depDate.getTime() / 1000);
          gmapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${finalOrigin}&destination=${finalDest}&travelmode=transit&departure_time=${depTimeValue}`;
        }
      } catch (e) {
        console.error('Error generating times for maps links:', e);
      }
    }
    
    return { 
      gmapsUrl 
    };
  }, [startPoint, destination, eventStartTime, tripMode]);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!startPoint) return;
    findRoutes(startPoint);
  }, [startPoint, findRoutes]);

  const { gmapsUrl } = getOfficialLinks(true);

  // JSX bleibt identisch — nur Logik optimiert
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
          />

          {/* Sheet */}
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300, mass: 0.8 }}
            className="absolute bottom-0 inset-x-0 sm:relative sm:w-full sm:max-w-2xl bg-[#0a0a0b] sm:border border-t border-white/10 rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh] sm:h-auto sm:max-h-[85vh]"
          >
            {/* Mobile Drag Indicator */}
            <div className="w-full flex justify-center pt-4 pb-2 sm:hidden absolute top-0 z-10 pointer-events-none">
              <div className="w-12 h-1.5 bg-white/20 rounded-full" />
            </div>

            {/* Header (Sticky) */}
            <div className="p-6 pt-10 sm:p-10 border-b border-white/5 bg-[#0a0a0b]/95 backdrop-blur-md shrink-0 z-0">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                    <Train className="w-5 h-5 sm:w-6 sm:h-6 text-white/40" />
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tighter">Route planen</h2>
                    <p className="text-[9px] sm:text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Öffentlicher Nahverkehr</p>
                  </div>
                  
                  {weather && (
                    <div className="ml-auto hidden sm:flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5">
                      {weather.code <= 3 ? <Sun className="w-4 h-4 text-emerald-400" /> : <CloudRain className="w-4 h-4 text-blue-400" />}
                      <span className="text-xs font-bold text-white">{Math.round(weather.temp)}°C</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {weather && (
                    <div className="sm:hidden flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2 py-1">
                      {weather.code <= 3 ? <Sun className="w-3 h-3 text-emerald-400" /> : <CloudRain className="w-3 h-3 text-blue-400" />}
                      <span className="text-[10px] font-bold text-white">{Math.round(weather.temp)}°C</span>
                    </div>
                  )}
                  <button 
                    onClick={onClose}
                    className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/5 text-white/20 hover:text-white transition-all active:scale-90"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex gap-2 p-1 bg-white/[0.03] rounded-xl border border-white/5">
                <button 
                  onClick={() => setTripMode('outbound')}
                  className={`flex-1 py-2.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none ${tripMode === 'outbound' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                >
                  <ArrowRight className="w-3 h-3 inline mr-1 mb-0.5" /> Hinfahrt
                </button>
                <button 
                  onClick={() => setTripMode('return')}
                  className={`flex-1 py-2.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest transition-all focus:outline-none ${tripMode === 'return' ? 'bg-white/10 text-white shadow-sm' : 'text-white/40 hover:text-white/80 hover:bg-white/5'}`}
                >
                  <Repeat className="w-3 h-3 inline mr-1 mb-0.5" /> Rückfahrt
                </button>
              </div>
            </div>

            {/* Scrollable Content Area */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-6 sm:p-10 space-y-8 no-scrollbar pb-24 sm:pb-10">
              
              {/* Location Summary */}
              <div className="flex items-center gap-4 p-4 bg-white/[0.03] rounded-2xl border border-white/5">
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                  <MapPin className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-black text-white/20 uppercase tracking-widest">
                    {tripMode === 'outbound' ? 'Ziel' : 'Start'}
                  </div>
                  <div className="text-sm sm:text-base font-bold text-white truncate">{destinationName}</div>
                </div>
              </div>

              {/* Start Input */}
              <div className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text"
                      placeholder={tripMode === 'outbound' ? "Startort eingeben..." : "Zielort eingeben..."}
                      value={startPoint}
                      onChange={(e) => {
                        setStartPoint(e.target.value);
                        setUseCurrentLocation(false);
                      }}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-[1.25rem] pl-12 pr-4 text-white placeholder:text-white/20 focus:ring-2 focus:ring-white/10 outline-none transition-all font-medium"
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                  </div>
                  <button 
                    type="submit"
                    className="h-14 px-6 bg-white shrink-0 text-black text-sm font-bold rounded-[1.25rem] hover:bg-white/90 transition-colors active:scale-95 shadow-lg shadow-white/5"
                  >
                    Suchen
                  </button>
                </form>

                {/* Quick Actions Array */}
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <button 
                    type="button"
                    onClick={() => handleGetCurrentLocation(undefined, tripMode)}
                    className="flex items-center gap-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-all active:scale-95"
                  >
                    <Navigation className="w-3 h-3" /> Live Standort
                  </button>
                  
                  {homeAddress ? (
                    <button 
                      type="button"
                      onClick={handleLoadHome}
                      className="flex items-center gap-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-blue-400 transition-all active:scale-95"
                    >
                       <Home className="w-3 h-3" /> {tripMode === 'outbound' ? 'Zuhause → Event' : 'Event → Zuhause'}
                    </button>
                  ) : (
                    <button 
                      type="button"
                      onClick={handleSaveHome}
                      disabled={!startPoint || startPoint === 'Aktueller Standort'}
                      className="flex items-center gap-1.5 bg-white/5 hover:bg-white/10 border border-white/5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Tippe deinen Wohnort ein und speichere ihn hier als Favorit"
                    >
                       <Home className="w-3 h-3" /> Als Zuhause merken
                    </button>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => setShowTimePicker(!showTimePicker)}
                    className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors ml-1 active:scale-95"
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {(() => {
                      if (!departureTime) return 'Abfahrt: Jetzt';
                      try {
                        return <span className="text-white">Abfahrt: {format(parseISO(departureTime), 'dd.MM. HH:mm')}</span>;
                      } catch (e) {
                        return 'Abfahrt: Jetzt';
                      }
                    })()}
                  </button>

                  <AnimatePresence>
                    {showTimePicker && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden space-y-4"
                      >
                        <div className="flex gap-2">
                          <input 
                            type="datetime-local"
                            value={departureTime}
                            onChange={(e) => {
                              setDepartureTime(e.target.value);
                              if (startPoint) findRoutes(startPoint);
                            }}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white text-xs outline-none focus:ring-2 focus:ring-white/10 transition-all [color-scheme:dark]"
                          />
                          {departureTime && (
                            <button 
                              onClick={() => {
                                setDepartureTime('');
                                if (startPoint) findRoutes(startPoint);
                              }}
                              className="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-all"
                            >
                              Jetzt
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-y-auto p-8 sm:p-10 space-y-8">
              {meta && !loading && !error && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`p-6 rounded-[3rem] border flex items-center gap-6 ${
                    meta.globalAdvice === 'leave_now' ? 'bg-red-500/10 border-red-500/20' :
                    meta.globalAdvice === 'leave_soon' ? 'bg-amber-500/10 border-amber-500/20' :
                    'bg-emerald-500/10 border-emerald-500/20'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                    meta.globalAdvice === 'leave_now' ? 'bg-red-500 text-white shadow-red-500/20' :
                    meta.globalAdvice === 'leave_soon' ? 'bg-amber-500 text-white shadow-amber-500/20' :
                    'bg-emerald-500 text-white shadow-emerald-500/20'
                  }`}>
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-1">Empfehlung</div>
                    <div className="text-sm font-bold text-white leading-tight">{meta.globalMessage}</div>
                  </div>
                </motion.div>
              )}

              {/* Navigation Link */}
              <div className="space-y-6">
                
                {/* Proposed Connections List */}
                {connections.length > 0 && !loading && (
                  <div className="space-y-3 mb-8">
                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-4 text-center">
                      Nächste Verbindungen
                    </div>
                    {connections.slice(0, 3).map((conn, idx) => {
                      const depTime = format(parseISO(conn.departure), 'HH:mm');
                      const arrTime = format(parseISO(conn.arrival), 'HH:mm');
                      const isArrivalMode = !!eventStartTime && !departureTime;
                      
                      return (
                        <div key={conn.id || idx} className="p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[1.5rem] flex items-center gap-4 transition-all group">
                          <div className="w-12 h-12 bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-white/5">
                            <span className="text-[11px] font-bold text-white leading-none mb-1">{depTime}</span>
                            <span className="text-[9px] font-black text-white/40 leading-none">{arrTime}</span>
                          </div>
                          
                          <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
                            <div className="flex items-center gap-2 text-white/60 text-[10px] uppercase font-bold tracking-wider">
                              <span>{conn.duration} Min</span>
                              <span>•</span>
                              <span>{conn.transfers} Umstiege</span>
                            </div>
                            
                            <div className="flex flex-wrap gap-1.5 mt-0.5">
                              {conn.legs.map((l: any, i: number) => (
                                <div key={i} className="flex items-center gap-1 bg-white/10 px-2 py-1 rounded-lg uppercase text-[9px] font-bold text-white/80 whitespace-nowrap">
                                  {getIcon(l.mode)} {l.line || l.mode}
                                </div>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            {/* Emphasize arrival constraint if applicable */}
                            {isArrivalMode && tripMode === 'outbound' && (
                               <div className="text-[9px] font-bold text-emerald-400 border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 rounded-lg text-center leading-tight">
                                 Pünktlich<br/>zum Start
                               </div>
                            )}
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                handleShareRoute(conn);
                              }}
                              className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center border border-white/5 text-white/40 hover:text-white transition-colors"
                              title="Route teilen"
                            >
                              <Share className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-4 text-center">Routenführung</div>
                
                <motion.a 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href={gmapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => {
                    // Try to force it to open in a new tab if standard navigation is being blocked
                    e.preventDefault();
                    window.open(gmapsUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex flex-col items-center justify-center gap-6 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 p-10 rounded-[3rem] transition-all group shadow-[0_20px_50px_rgba(16,185,129,0.1)] relative overflow-hidden"
                >
                  <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none" />
                  <div className="w-20 h-20 bg-emerald-500 rounded-[2rem] flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.4)]">
                    <Navigation className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-serif font-bold text-white tracking-tighter mb-2">In Google Maps navigieren</div>
                    <div className="text-[10px] font-black text-emerald-400/60 uppercase tracking-[0.3em]">
                      {(() => {
                        if (!eventStartTime) return 'Optimale Verbindung';
                        try {
                          return `Ankunft geplant für ${format(parseISO(eventStartTime), 'HH:mm')} Uhr`;
                        } catch (e) {
                          return 'Optimale Verbindung';
                        }
                      })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-black text-white/20 uppercase tracking-widest mt-4">
                    Klicken zum Starten <ExternalLink className="w-3 h-3" />
                  </div>
                </motion.a>

                {loading && (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
                    <p className="text-[10px] font-black text-white/20 uppercase tracking-widest">Analysiere Verkehrslage...</p>
                  </div>
                )}

                {error && !loading && (
                  <div className="p-8 bg-red-500/5 border border-red-500/10 rounded-[2rem] text-center">
                    <AlertCircle className="w-8 h-8 text-red-500/40 mx-auto mb-4" />
                    <p className="text-white/40 font-medium text-sm leading-relaxed">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 sm:p-10 bg-[#0a0a0b] border-t border-white/5 text-center shrink-0">
              <p className="text-[9px] font-black text-white/10 uppercase tracking-[0.3em] leading-relaxed">
                DATEN WERDEN IN ECHTZEIT GELADEN.<br />BITTE PRÜFE DIE VERBINDUNGEN VOR ORT.
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
