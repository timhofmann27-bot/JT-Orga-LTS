import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Extends Window to support the beforeinstallprompt event.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string
  }>;
  prompt(): Promise<void>;
}

export default function InstallAppBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed/running in standalone mode
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || 
                             (window.navigator as any).standalone || 
                             document.referrer.includes('android-app://');
    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // Show prompt automatically for iOS a few seconds after loading
      const timer = setTimeout(() => {
        const hasSeenPrompt = sessionStorage.getItem('pwa_prompt_seen');
        if (!hasSeenPrompt) {
          setShowPrompt(true);
        }
      }, 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Wait a moment so it isn't completely jarring, or show immediately
      const hasSeenPrompt = sessionStorage.getItem('pwa_prompt_seen');
      if (!hasSeenPrompt) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleClose = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_seen', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        className="fixed bottom-24 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 sm:w-96 bg-blue-600 rounded-[2rem] p-6 shadow-2xl z-[100] text-white flex flex-col gap-4 border border-blue-400/30 overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-tr from-black/20 to-transparent pointer-events-none" />
        
        <button 
          onClick={handleClose}
          className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex gap-4 items-start relative z-10">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
            <Download className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold font-serif tracking-tight mb-1">App installieren</h3>
            <p className="text-sm text-blue-100 font-medium leading-relaxed">
              Füge diese App zu deinem Startbildschirm hinzu, um sie im Vollbildmodus und offline zu nutzen.
            </p>
          </div>
        </div>

        <div className="mt-2 relative z-10">
          {!isIOS ? (
            <button 
              onClick={handleInstallClick}
              className="w-full bg-white text-blue-700 font-black uppercase tracking-widest text-[11px] py-4 rounded-2xl shadow-lg hover:bg-white/90 active:scale-95 transition-all"
            >
              Jetzt Installieren
            </button>
          ) : (
            <div className="bg-black/20 rounded-xl p-4 text-xs text-white/90 leading-relaxed font-medium">
              <ol className="list-decimal pl-4 space-y-2">
                <li>Tippe auf Teilen <Share className="w-3 h-3 inline mb-0.5" /></li>
                <li>Wähle <span className="font-bold bg-white/10 px-1 py-0.5 rounded text-[10px]">Zum Home-Bildschirm <PlusSquare className="w-3 h-3 inline mb-0.5" /></span> ein</li>
              </ol>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
