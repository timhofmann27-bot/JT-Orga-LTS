import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellRing, Check, CheckCircle2, Pin, BarChart2, Calendar, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

function notifIcon(notif: any) {
  const t = (notif.title || '').toLowerCase();
  const m = (notif.message || '').toLowerCase();
  if (t.includes('umfrage') || m.includes('umfrage'))
    return { icon: BarChart2, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  if (t.includes('einladung') || m.includes('eingeladen') || m.includes('event'))
    return { icon: Calendar, color: '#f97316', bg: 'rgba(249,115,22,0.12)' };
  if (t.includes('beitrag') || m.includes('pinnwand') || m.includes('beitrag'))
    return { icon: Pin, color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' };
  return { icon: Info, color: '#a1a1aa', bg: 'rgba(161,161,170,0.1)' };
}

interface NotificationsMenuProps {
  apiPrefix: string;
}

export default function NotificationsMenu({ apiPrefix }: NotificationsMenuProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`${apiPrefix}/notifications`);
      if (res.ok) {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          setNotifications(await res.json());
        }
      }
    } catch (e: any) {
      if (e.name !== 'TypeError' && e.message !== 'Failed to fetch') {
        console.error('Failed to fetch notifications', e);
      }
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [apiPrefix]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleRead = async (id: number, link?: string) => {
    try {
      await fetch(`${apiPrefix}/notifications/${id}/read`, { method: 'PUT' });
      setNotifications(notifications.map(n => n.id === id ? { ...n, is_read: 1 } : n));
      if (link) {
        setIsOpen(false);
        navigate(link);
      }
    } catch (e) {
      console.error('Failed to mark as read', e);
    }
  };

  const handleReadAll = async () => {
    try {
      await fetch(`${apiPrefix}/notifications/read-all`, { method: 'PUT' });
      setNotifications(notifications.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error('Failed to mark all as read', e);
    }
  };

  const renderMessage = (message: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = message.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300 break-all">{part}</a>;
      }
      return part;
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-white/60 hover:text-white transition-colors rounded-xl hover:bg-white/10"
      >
        {unreadCount > 0 ? (
          <BellRing className="w-5 h-5 text-accent animate-pulse" />
        ) : (
          <Bell className="w-5 h-5" />
        )}
        {unreadCount > 0 && (
          <motion.span
            key={unreadCount}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-red-500 text-white text-[10px] font-black rounded-full border-2 border-[#111]"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-screen w-full sm:w-[400px] bg-[#111] border-l border-white/10 shadow-2xl z-[100] flex flex-col"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5 relative z-10">
              <h3 className="font-bold text-white">Benachrichtigungen</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleReadAll}
                  className="text-xs text-white/50 hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  <Check className="w-3 h-3" />
                  Alle als gelesen markieren
                </button>
              )}
            </div>
            
            <div className="max-h-[60vh] overflow-y-auto custom-scrollbar relative z-10" style={{ maxHeight: "calc(100vh - 150px)" }}>
              {notifications.length === 0 ? (
                <div className="p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4 border border-white/10">
                    <Bell className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-white/40 text-sm font-medium">Keine Benachrichtigungen vorhanden.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {notifications.map(notif => {
                    const { icon: NIcon, color, bg } = notifIcon(notif);
                    return (
                    <div 
                      key={notif.id}
                      onClick={() => handleRead(notif.id, notif.link)}
                      className={`p-4 hover:bg-white/[0.07] cursor-pointer transition-all flex gap-3 ${!notif.is_read ? 'bg-white/[0.03]' : ''}`}
                    >
                      <div className="shrink-0" style={{ width: 36, height: 36, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <NIcon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <div className={`text-sm truncate ${!notif.is_read ? 'font-bold text-white' : 'font-medium text-white/70'}`}>
                            {notif.title}
                          </div>
                          {!notif.is_read && (
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
                          )}
                        </div>
                        <div className="text-sm text-white/50 mt-0.5 leading-relaxed line-clamp-2">
                          {renderMessage(notif.message)}
                        </div>
                        <div className="text-xs text-white/40 mt-1.5 font-mono tracking-tight opacity-70">
                          {formatDistanceToNow(parseISO(notif.created_at), { addSuffix: true, locale: de })}
                        </div>
                      </div>
                    </div>
                  )})}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
