import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Send, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BroadcastNotification() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSend = async () => {
    if (!title || !body) {
      toast.error('Bitte Titel und Nachricht ausfüllen');
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch('/api/admin/broadcast-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body })
      });

      if (response.ok) {
        toast.success('Benachrichtigung wurde an alle versendet!');
        setTitle('');
        setBody('');
        setShowConfirm(false);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Fehler beim Senden');
      }
    } catch (e) {
      toast.error('Netzwerkfehler beim Senden');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-text mb-2">Push-Benachrichtigung senden</h1>
        <p className="text-gray-400 text-sm">
          Sende eine wichtige Nachricht direkt an alle registrierten Mitglieder als Push-Benachrichtigung.
        </p>
      </header>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface-muted border border-border rounded-2xl p-6"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-widest mb-2 px-1">
              Betreff / Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z.B. Wichtige Änderung!"
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:border-white/30 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-dim uppercase tracking-widest mb-2 px-1">
              Nachricht
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Deine Nachricht an alle..."
              rows={4}
              className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-text focus:outline-none focus:border-white/30 transition-colors resize-none"
            />
          </div>

          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="w-full bg-white text-black font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
            >
              <Send className="w-4 h-4" />
              Senden an alle Mitglieder
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-bold text-text uppercase tracking-wider">Sicher?</h3>
                  <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                    Diese Nachricht wird sofort an ALLE registrierten Nutzer gesendet, die Push-Benachrichtigungen aktiviert haben. Diese Aktion kann nicht rückgängig gemacht werden.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  disabled={isSending}
                  onClick={handleSend}
                  className="flex-1 bg-red-600 text-text font-bold py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Ja, jetzt senden
                </button>
                <button
                  disabled={isSending}
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-white/5 text-text font-bold py-3 rounded-lg hover:bg-white/10 transition-colors"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      <div className="mt-8 space-y-4">
        <h3 className="text-xs font-bold text-text-dim uppercase tracking-widest px-1">Tipps</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-muted border border-border rounded-xl p-4">
            <h4 className="text-text text-xs font-bold mb-1 italic">Kurz & Knapp</h4>
            <p className="text-text-dim text-[10px] leading-normal uppercase tracking-wider">
              Push-Nachrichten werden auf dem Sperrbildschirm oft gekürzt. Halte die wichtigste Info im Titel.
            </p>
          </div>
          <div className="bg-surface-muted border border-border rounded-xl p-4">
            <h4 className="text-text text-xs font-bold mb-1 italic">Zielgruppe</h4>
            <p className="text-text-dim text-[10px] leading-normal uppercase tracking-wider">
              Nutze diese Funktion nur für wirklich wichtige Informationen, die alle betreffen.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
