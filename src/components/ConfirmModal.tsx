import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-2xl">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="bg-[#050505] border border-white/10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl max-w-sm w-full p-6 sm:p-12 relative overflow-hidden"
          >
            <button 
              onClick={onCancel} 
              className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white/20 hover:text-white transition-colors z-10"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-6 mb-8 relative z-10">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-7 h-7 text-red-400/60" />
              </div>
              <h3 className="text-2xl font-serif font-bold text-white tracking-tight">{title}</h3>
            </div>
            
            <p className="text-white/40 text-sm mb-10 font-medium leading-relaxed">{message}</p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={onConfirm} 
                className="w-full px-6 py-4 text-sm font-bold text-white bg-red-600/80 hover:bg-red-600 rounded-2xl transition-all shadow-xl shadow-red-900/20"
              >
                Bestätigen
              </button>
              <button 
                onClick={onCancel} 
                className="w-full px-6 py-4 text-sm font-bold text-white/40 hover:text-white hover:bg-white/5 rounded-2xl transition-all"
              >
                Abbrechen
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
