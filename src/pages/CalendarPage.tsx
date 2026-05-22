import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, MapPin, Users, Calendar as CalendarIcon, Clock, AlertCircle, Info } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isSameMonth, isSameDay, isToday, getDay } from 'date-fns';
import { de } from 'date-fns/locale';

interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  location: string | null;
  type: string;
  description: string | null;
  participant_count: number;
}

const typeConfig: Record<string, { label: string; color: string; bg: string }> = {
  wanderung: { label: 'WANDERUNG', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
  sport: { label: 'SPORT', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  demo: { label: 'DEMO', color: 'text-red-400', bg: 'bg-red-500/20' },
  spontan: { label: 'SPONTAN', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  event: { label: 'EVENT', color: 'text-purple-400', bg: 'bg-purple-500/20' },
};

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [animDir, setAnimDir] = useState<'left' | 'right'>('left');
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/calendar/events')
      .then(r => { if (!r.ok) throw new Error('Fehler'); return r.json(); })
      .then(d => { setEvents(d || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      try {
        const dayKey = format(parseISO(ev.date), 'yyyy-MM-dd');
        const existing = map.get(dayKey) || [];
        existing.push(ev);
        map.set(dayKey, existing);
      } catch { /* skip invalid */ }
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  const changeMonth = (dir: 'prev' | 'next') => {
    setAnimDir(dir === 'prev' ? 'right' : 'left');
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + (dir === 'prev' ? -1 : 1));
      return d;
    });
    setSelectedDate(null);
  };

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    const key = format(day, 'yyyy-MM-dd');
    return eventsByDate.get(key) || [];
  };

  const selectedDayEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-text-dim">Kalender wird geladen...</p>
        </div>
      </div>
    );
  }

  const todayEventsCount = getEventsForDay(new Date()).length;

  return (
    <div className="py-6 pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 px-4">
        <div>
          <h1 className="text-2xl font-bold text-text tracking-tight">Kalender</h1>
          <p className="text-xs text-text-dim mt-0.5">
            {events.length} Aktionen{todayEventsCount > 0 ? ` · ${todayEventsCount} heute` : ''}
          </p>
        </div>
        <button
          onClick={() => setCurrentMonth(new Date())}
          className="px-3 py-2 bg-accent/10 border border-accent/20 rounded-xl text-[10px] font-bold text-accent uppercase tracking-wider"
        >
          Heute
        </button>
      </div>

      {/* Month nav */}
      <div className="flex items-center justify-between mb-5 px-4">
        <button onClick={() => changeMonth('prev')}
          className="w-10 h-10 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text hover:border-accent/30 active:scale-90 transition-all">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-black text-text tracking-tight">
          {format(currentMonth, 'MMMM', { locale: de })}
          <span className="text-text-dim font-bold ml-1.5">{format(currentMonth, 'yyyy')}</span>
        </h2>
        <button onClick={() => changeMonth('next')}
          className="w-10 h-10 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text hover:border-accent/30 active:scale-90 transition-all">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 mb-1.5 px-4">
        {dayNames.map(d => (
          <div key={d} className="text-center text-[9px] font-bold text-text-dim/40 uppercase tracking-widest py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-px bg-border/20 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
        {days.map((day, i) => {
          const dayEvents = getEventsForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDate && isSameDay(day, selectedDate);
          const dow = getDay(day);
          const isWeekend = dow === 0 || dow === 6;
          const hasEvents = dayEvents.length > 0;

          return (
            <button
              key={i}
              onClick={() => setSelectedDate(selected ? null : day)}
              className={`relative flex flex-col items-center justify-center py-3 transition-all active:scale-90 ${
                selected
                  ? 'bg-accent text-white font-bold'
                  : today
                    ? 'bg-accent/10'
                    : inMonth
                      ? 'bg-surface hover:bg-surface-elevated'
                      : 'bg-surface/30'
              } ${i === 0 ? 'rounded-tl-2xl' : ''} ${i === 6 ? 'rounded-tr-2xl' : ''}`}
            >
              <span className={`text-xs leading-none transition-all ${
                selected ? 'text-white' :
                today ? 'text-accent font-bold' :
                inMonth ? (isWeekend ? 'text-text-dim/50' : 'text-text') :
                'text-text-dim/15'
              }`}>
                {format(day, 'd')}
              </span>
              {hasEvents && (
                <div className={`flex gap-0.5 mt-1 transition-all ${selected ? 'opacity-70' : ''}`}>
                  {dayEvents.slice(0, 3).map((ev, j) => {
                    const tc = typeConfig[ev.type];
                    return (
                      <span
                        key={j}
                        className={`w-1 h-1 rounded-full ${tc?.color ? tc.color.replace('text-', 'bg-') : 'bg-accent'} ${selected ? 'bg-white/60' : ''}`}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <span className={`text-[7px] font-bold ${selected ? 'text-white/70' : 'text-text-dim'}`}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              )}
              {!hasEvents && inMonth && !today && (
                <span className="h-1.5" />
              )}
              {today && !hasEvents && (
                <span className="h-1.5 w-1.5 bg-accent rounded-full opacity-40" />
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day events */}
      {selectedDate && (
        <div className="mt-6 px-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-1 h-6 bg-accent rounded-full" />
            <div>
              <h3 className="text-base font-bold text-text">
                {format(selectedDate, 'EEEE', { locale: de })}
              </h3>
              <p className="text-xs text-text-dim">
                {format(selectedDate, 'dd. MMMM yyyy', { locale: de })}
                {selectedDayEvents.length > 0 && ` · ${selectedDayEvents.length} Aktion${selectedDayEvents.length !== 1 ? 'en' : ''}`}
              </p>
            </div>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-text-dim">
              <CalendarIcon className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm font-medium">Keine Aktionen</p>
              <p className="text-[10px] opacity-40 mt-1">An diesem Tag ist nichts geplant</p>
            </div>
          ) : (
            <div className="space-y-3">
              {selectedDayEvents.map(ev => {
                const tc = typeConfig[ev.type] || typeConfig.event;
                return (
                  <button
                    key={ev.id}
                    onClick={() => navigate(`/events/${ev.id}`)}
                    className="w-full relative group active:scale-[0.98] transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl" />
                    <div className="relative p-4 bg-surface-muted border border-border rounded-2xl hover:border-accent/30 transition-all">
                      <div className="flex items-start gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${tc.color.replace('text-', 'bg-')}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[9px] font-bold ${tc.color} uppercase tracking-widest ${tc.bg} px-1.5 py-0.5 rounded-md`}>
                              {tc.label}
                            </span>
                            <span className="text-[10px] text-text-dim font-mono">
                              {format(parseISO(ev.date), 'HH:mm')} Uhr
                            </span>
                          </div>
                          <h4 className="text-sm font-bold text-text truncate group-hover:text-accent transition-colors">
                            {ev.title}
                          </h4>
                          <div className="flex items-center gap-3 mt-1.5">
                            {ev.location && (
                              <span className="flex items-center gap-1 text-[10px] text-text-dim truncate">
                                <MapPin className="w-3 h-3 shrink-0" />
                                {ev.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-[10px] text-text-dim">
                              <Users className="w-3 h-3 shrink-0" />
                              {ev.participant_count}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-dim/30 group-hover:text-text-dim shrink-0 mt-1 transition-colors" />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* No events at all */}
      {events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-text-dim mt-4 px-4">
          <CalendarIcon className="w-16 h-16 mb-4 opacity-10" />
          <p className="text-base font-bold opacity-50">Noch keine Aktionen</p>
          <p className="text-xs opacity-30 mt-1">Sobald Events erstellt werden, erscheinen sie hier</p>
        </div>
      )}
    </div>
  );
}
