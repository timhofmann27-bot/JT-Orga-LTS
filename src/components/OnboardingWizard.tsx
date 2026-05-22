import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowRight, Check, Bell, Smartphone,
  MessageSquare, Calendar, Sparkles, Download, X,
  Pin, MapPin, Heart, ChevronRight, Send, User,
} from 'lucide-react';

interface ChatMessage {
  from: 'system' | 'user';
  text: string;
  icon?: React.ReactNode;
  action?: { label: string; value: string };
  choices?: { label: string; value: string; icon?: React.ReactNode }[];
}

interface OnboardingStep {
  id: string;
  messages: ChatMessage[];
  userInput: boolean;
}

export default function OnboardingWizard({
  isOpen,
  onComplete,
  onClose,
}: {
  isOpen: boolean;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [msgIndex, setMsgIndex] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const [pwaInstalled, setPwaInstalled] = useState(false);
  const [notifsEnabled, setNotifsEnabled] = useState(false);
  const [typing, setTyping] = useState(true);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) setPwaInstalled(true);
    if ('Notification' in window && Notification.permission === 'granted') setNotifsEnabled(true);
    const handler = (e: Event) => { e.preventDefault(); };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    setPwaInstalled(true);
  }, []);

  const handleEnableNotifications = useCallback(async () => {
    try {
      if ('Notification' in window) {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          setNotifsEnabled(true);
          try {
            const { requestNotificationPermission } = await import('../lib/firebase');
            const token = await requestNotificationPermission();
            if (token) {
              await fetch('/api/auth/fcm-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
              });
            }
          } catch {}
        }
      }
    } catch {}
  }, []);

  // Reveal messages with typing animation
  useEffect(() => {
    if (revealed < steps[step].messages.length) {
      const timer = setTimeout(() => {
        setRevealed(r => r + 1);
        setTyping(true);
        setTimeout(() => setTyping(false), 600);
      }, 900);
      return () => clearTimeout(timer);
    }
  }, [revealed, step]);

  const steps: OnboardingStep[] = [
    {
      id: 'welcome',
      userInput: false,
      messages: [
        { from: 'system', text: '👋 Hey! Willkommen bei der JT-Orga.', icon: <Sparkles className="w-4 h-4" /> },
        { from: 'system', text: 'Dein Einladungslink hat funktioniert — du bist jetzt Teil des Teams. 🎉' },
        { from: 'system', text: 'Ich zeig dir kurz, wie alles funktioniert. Einverstanden?', choices: [
          { label: 'Ja, zeig her!', value: 'next' },
          { label: 'Später', value: 'skip' },
        ]},
      ],
    },
    {
      id: 'profile',
      userInput: false,
      messages: [
        { from: 'system', text: '👤 Zuerst: Leg dein Profil fest.', icon: <User className="w-4 h-4" /> },
        { from: 'system', text: 'Geh auf <b>Profil</b> (unten rechts) und trag deinen Namen, ein Bild und deine Kontaktdaten ein.' },
        { from: 'system', text: 'So wissen alle, wer du bist und können dich bei Aktionen erreichen.' },
        { from: 'system', text: 'Das kannst du jederzeit später ändern. Aber einmal kurz reinschauen lohnt sich!', choices: [
          { label: 'Verstanden 👍', value: 'next' },
        ]},
      ],
    },
    {
      id: 'install',
      userInput: false,
      messages: [
        { from: 'system', text: '📱 Als Erstes: Füg die App zu deinem Startbildschirm hinzu.', icon: <Smartphone className="w-4 h-4" /> },
        { from: 'system', text: 'So hast du JT-Orga immer mit einem Tap griffbereit — wie eine normale App.' },
        { from: 'system', text: 'Tipp dafür im Browser auf <b>Teilen</b> und dann auf <b>„Zum Home-Bildschirm"</b>.' },
        pwaInstalled
          ? { from: 'user', text: '✅ Ist schon installiert!' }
          : { from: 'system', text: '', choices: [
              { label: 'Installieren', value: 'install', icon: <Download className="w-4 h-4" /> },
              { label: 'Überspringen', value: 'next' },
            ]},
      ],
    },
    {
      id: 'notifications',
      userInput: false,
      messages: [
        { from: 'system', text: '🔔 Benachrichtigungen sind wichtig.', icon: <Bell className="w-4 h-4" /> },
        { from: 'system', text: 'So verpasst du keine neue Aktion, keinen Pinnwand-Beitrag und keine wichtigen Updates.' },
        notifsEnabled
          ? { from: 'user', text: '✅ Sind schon aktiviert!' }
          : { from: 'system', text: '', choices: [
              { label: 'Aktivieren', value: 'notifications', icon: <Bell className="w-4 h-4" /> },
              { label: 'Überspringen', value: 'next' },
            ]},
      ],
    },
    {
      id: 'pinnwand',
      userInput: false,
      messages: [
        { from: 'system', text: '📋 Die <b>Pinnwand</b> ist euer schwarzes Brett.', icon: <Pin className="w-4 h-4" /> },
        { from: 'system', text: 'Hier postest du Nachrichten, Umfragen und Infos für alle.' },
        { from: 'system', text: 'Du erreichst sie über den Tab „Pinnwand" unten oder in der Seitenleiste.' },
        { from: 'system', text: 'Jeder neue Post benachrichtigt automatisch alle Mitglieder. Praktisch, oder?', choices: [
          { label: 'Verstanden 👍', value: 'next' },
        ]},
      ],
    },
    {
      id: 'aktionen',
      userInput: false,
      messages: [
        { from: 'system', text: '📅 Unter <b>Aktionen</b> findest du alle Events.', icon: <Calendar className="w-4 h-4" /> },
        { from: 'system', text: 'Öffne eine Aktion und du siehst:' },
        { from: 'system', text: '📍 Treffpunkt & Anfahrtsplan\n✅ Mitbringliste zum Eintragen\n📊 Umfragen zum Abstimmen\n💬 Chat für die Gruppe<br/>✅ Zusagen / Absagen mit einem Tap' },
        { from: 'system', text: 'Du wirst zu jeder neuen Aktion eingeladen und bekommst eine Benachrichtigung.', choices: [
          { label: 'Klingt super! 👊', value: 'next' },
        ]},
      ],
    },
    {
      id: 'done',
      userInput: false,
      messages: [
        { from: 'system', text: 'Das war\'s auch schon! 🚀', icon: <Sparkles className="w-4 h-4" /> },
        { from: 'system', text: 'Du bist startklar. Alle Aktionen und die Pinnwand findest du im Dashboard.' },
        { from: 'system', text: 'Viel Spaß und willkommen an Bord! 🎉', choices: [
          { label: 'Zum Dashboard', value: 'done', icon: <ChevronRight className="w-4 h-4" /> },
        ]},
      ],
    },
  ];

  const current = steps[step];
  const visibleMessages = current.messages.slice(0, revealed);

  const handleChoice = async (value: string) => {
    if (value === 'skip') { onClose(); return; }
    if (value === 'done') { onComplete(); return; }
    if (value === 'next') {
      setRevealed(0);
      setStep(s => s + 1);
      return;
    }
    if (value === 'install') {
      await handleInstall();
      setRevealed(0);
      setStep(s => s + 1);
      return;
    }
    if (value === 'notifications') {
      await handleEnableNotifications();
      setRevealed(0);
      setStep(s => s + 1);
      return;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4"
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="relative z-10 w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] bg-[#0D0D0D] border border-white/10 sm:rounded-[2rem] rounded-t-[2rem] overflow-hidden shadow-2xl flex flex-col"
          >
            {/* Chat header */}
            <div className="shrink-0 px-5 py-4 border-b border-white/10 flex items-center gap-3 bg-[#0D0D0D]">
              <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-text">JT-Orga</p>
                <p className="text-[10px] text-text-dim">Willkommens-Assistent</p>
              </div>
              <button
                onClick={onClose}
                className="ml-auto w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-text-dim hover:text-text transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Progress dots */}
            <div className="shrink-0 flex justify-center gap-1.5 py-2 bg-[#0D0D0D]">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    i <= step ? 'bg-accent scale-110' : 'bg-white/15'
                  }`}
                />
              ))}
            </div>

            {/* Chat messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ background: '#0D0D0D' }}>
              {visibleMessages.map((msg, i) => {
                // Filter out empty messages (system with no text and no choices)
                if (!msg.text && (!msg.choices || msg.choices.length === 0)) return null;

                const isLast = i === visibleMessages.length - 1;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.25 }}
                    className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex gap-2.5 max-w-[85%] ${msg.from === 'user' ? 'flex-row-reverse' : ''}`}>
                      {msg.from === 'system' && msg.icon && (
                        <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center shrink-0 mt-0.5">
                          {msg.icon}
                        </div>
                      )}
                      {msg.from === 'system' && !msg.icon && (
                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="w-4 h-4 text-accent/40" />
                        </div>
                      )}
                      <div>
                        {msg.text && (
                          <div
                            className={`px-4 py-3 text-sm leading-relaxed ${
                              msg.from === 'user'
                                ? 'bg-accent text-white rounded-2xl rounded-tr-md'
                                : 'bg-white/5 text-text/90 rounded-2xl rounded-tl-md'
                            }`}
                            dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }}
                          />
                        )}
                        {msg.choices && isLast && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.choices.map((choice) => (
                              <button
                                key={choice.value}
                                onClick={() => handleChoice(choice.value)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-accent text-white rounded-xl text-sm font-semibold hover:bg-accent/90 transition-all active:scale-95"
                              >
                                {choice.icon}
                                {choice.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Typing indicator */}
              {typing && revealed < current.messages.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-2 pl-10"
                >
                  <div className="flex gap-1 px-4 py-3 bg-white/5 rounded-2xl rounded-tl-md">
                    <span className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-accent/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </motion.div>
              )}
            </div>

            {/* Skip */}
            <div className="shrink-0 px-4 pb-4 pt-1 text-center bg-[#0D0D0D]">
              <button
                onClick={onComplete}
                className="text-[11px] text-text-dim hover:text-text-muted transition-colors font-medium"
              >
                Überspringen → Direkt zum Dashboard
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
