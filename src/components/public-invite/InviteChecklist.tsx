import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, User, Lock, Repeat } from 'lucide-react';

interface InviteChecklistProps {
  checklist: any[];
  invitee: any;
  onRefresh: () => void;
  handleClaimItem: (itemId: number) => void;
  handleUnclaimItem: (itemId: number) => void;
}

export default function InviteChecklist({ checklist, invitee, onRefresh, handleClaimItem, handleUnclaimItem }: InviteChecklistProps) {
  return (
    <AnimatePresence>
      {checklist.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="bg-surface-muted rounded-[3.5rem] border border-white/5 p-10 sm:p-20 relative overflow-hidden"
        >
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h2 className="text-4xl font-serif font-bold text-white mb-2 tracking-tighter">Mitbringliste</h2>
                <p className="text-white/30 font-medium text-lg tracking-tight">Wer bringt was mit?</p>
              </div>
              <button 
                onClick={onRefresh}
                className="w-10 h-10 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-white/20 hover:text-white transition-all active:rotate-180 duration-500"
                title="Aktualisieren"
              >
                <Repeat className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid gap-4">
              {checklist.map(item => {
                const isClaimedByMe = item.claimer_person_id === invitee.person_id;
                const isClaimedByOther = item.claimer_person_id && !isClaimedByMe;
                
                return (
                  <motion.div 
                    key={item.id} 
                    layout
                    className={`flex items-center justify-between p-6 sm:p-8 rounded-[2.2rem] border transition-all duration-500 ${
                      isClaimedByMe ? 'bg-emerald-500/10 border-emerald-500/30' : 
                      isClaimedByOther ? 'bg-white/[0.02] border-white/5 opacity-60' : 
                      'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex flex-col gap-1 pr-4">
                      <span className={`text-xl font-serif font-bold tracking-tight transition-all ${
                        item.claimer_person_id ? 'text-white/40' : 'text-white'
                      }`}>
                        {item.item_name}
                      </span>
                      {item.notes && <span className="text-xs text-white/20 font-medium">{item.notes}</span>}
                      
                      {isClaimedByOther && (
                        <div className="flex items-center gap-2 text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mt-3">
                          <User className="w-3 h-3" /> {item.claimer_name}
                        </div>
                      )}
                      {isClaimedByMe && (
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mt-3">
                          <CheckCircle className="w-3 h-3" /> Von dir übernommen
                        </div>
                      )}
                    </div>
                    
                    <div className="shrink-0">
                      {!item.claimer_person_id ? (
                        <button 
                          onClick={() => handleClaimItem(item.id)}
                          className="bg-white text-black px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-90 shadow-xl"
                        >
                          Ich!
                        </button>
                      ) : isClaimedByMe ? (
                        <button 
                          onClick={() => handleUnclaimItem(item.id)}
                          className="w-12 h-12 bg-emerald-500 text-black rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 active:scale-90 transition-all hover:bg-rose-500 hover:text-white group"
                          title="Abgeben"
                        >
                          <CheckCircle className="w-6 h-6 group-hover:hidden" />
                          <XCircle className="w-6 h-6 hidden group-hover:block" />
                        </button>
                      ) : (
                        <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5">
                          <Lock className="w-5 h-5 text-white/10" />
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
