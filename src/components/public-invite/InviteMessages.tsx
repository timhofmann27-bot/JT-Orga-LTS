import React from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion } from 'motion/react';
import { MessageSquare, Trash2, Send } from 'lucide-react';

interface InviteMessagesProps {
  messages: any[];
  invitee: any;
  aktion: any;
  newMessage: string;
  setNewMessage: (s: string) => void;
  handlePostMessage: (e: React.FormEvent) => void;
  handleDeleteMessage: (msgId: number) => void;
}

export default function InviteMessages({ messages, invitee, aktion, newMessage, setNewMessage, handlePostMessage, handleDeleteMessage }: InviteMessagesProps) {
  return (
    <div className="premium-card rounded-4xl p-10 sm:p-20 relative overflow-hidden mt-12 border-white/[0.08] shadow-none">
      <div className="flex justify-between items-center mb-16">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
             <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
             <span className="micro-label uppercase tracking-[0.3em]">Kommunikationsbereich</span>
          </div>
          <h2 className="text-4xl sm:text-6xl font-serif font-black text-white tracking-tighter leading-none">Pinnwand</h2>
          <p className="text-white/30 font-medium text-lg leading-tight tracking-tight italic">Echte Gespräche, keine Filter.</p>
        </div>
        <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/10 group-hover:text-white/20 transition-colors">
           <MessageSquare className="w-8 h-8" />
        </div>
      </div>

      <div className="space-y-10 mb-16">
        {messages.length === 0 ? (
          <div className="text-center py-24 px-4 bg-white/[0.01] rounded-4xl border border-white/5 border-dashed">
             <p className="text-white/20 text-[10px] font-black uppercase tracking-[0.5em]">System bereit. Warten auf Signale...</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <motion.div 
              key={msg.id} 
              initial={{ opacity: 0, scale: 0.98 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`p-10 rounded-4xl border relative group transition-all duration-500 ${msg.is_admin ? 'bg-white text-black border-white shadow-[0_32px_64px_-16px_rgba(255,255,255,0.1)]' : 'bg-white/[0.02] border-white/[0.05] hover:border-white/10'}`}
            >
              <div className="flex justify-between items-start mb-6">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-3">
                    <span className={`font-serif font-black text-2xl tracking-tighter leading-none ${msg.is_admin ? 'text-black' : 'text-white'}`}>
                      {msg.is_admin ? (aktion?.title || 'Einsatzleitung') : msg.person_name}
                    </span>
                    {msg.is_admin && (
                      <div className="bg-black/10 px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest">
                         ORGA
                      </div>
                    )}
                  </div>
                  <span className={`micro-label !text-[9px] ${msg.is_admin ? 'text-black/30' : 'text-white/20'}`}>
                    {format(parseISO(msg.created_at), 'dd.MM • HH:mm')}
                  </span>
                </div>
                {msg.person_id === invitee.person_id && (
                  <button 
                    onClick={() => handleDeleteMessage(msg.id)} 
                    className={`transition-colors p-2 rounded-xl h-10 w-10 flex items-center justify-center ${msg.is_admin ? 'hover:bg-black/5 text-black/20 hover:text-red-600' : 'hover:bg-white/5 text-white/10 hover:text-red-400'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className={`text-xl font-medium leading-relaxed whitespace-pre-wrap tracking-tight italic font-serif ${msg.is_admin ? 'text-black/80' : 'text-white/60'}`}>
                "{msg.message}"
              </p>
            </motion.div>
          ))
        )}
      </div>

      {invitee.has_profile ? (
        <form onSubmit={handlePostMessage} className="relative group">
          <textarea
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            placeholder="Deine Nachricht an den Hub..."
            className="w-full bg-black/40 border border-white/5 rounded-[2.5rem] p-10 pr-24 text-white text-xl font-serif italic placeholder:text-white/10 outline-none focus:border-white/[0.08] transition-all resize-none h-48 focus:bg-black/60 shadow-inner"
          />
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit" 
            disabled={!newMessage.trim()}
            className="absolute bottom-8 right-8 w-16 h-16 bg-white text-black rounded-[1.8rem] flex items-center justify-center disabled:opacity-0 disabled:scale-90 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.2)]"
          >
            <Send className="w-6 h-6 -ml-0.5" />
          </motion.button>
        </form>
      ) : (
        <div className="bg-black/40 border-dashed border-2 border-white/5 rounded-4xl p-10 text-center">
          <p className="text-white/30 text-sm font-medium leading-relaxed italic">Erstelle unten ein Profil, um Signale an den Hub zu senden.</p>
        </div>
      )}
    </div>
  );
}
