import React, { useState } from 'react';
import { X, GripVertical, Eye, EyeOff, RotateCcw, Settings } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Widget } from '../lib/dashboard';

interface Props {
  widgets: Widget[];
  onToggle: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
  onReset: () => void;
  onClose: () => void;
}

export default function DashboardCustomizer({ widgets, onToggle, onMove, onReset, onClose }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const sortedWidgets = [...widgets].sort((a, b) => a.order - b.order);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-bold uppercase tracking-widest"
        title="Dashboard anpassen"
      >
        <Settings className="w-4 h-4" />
        Anpassen
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] w-full max-w-md bg-surface-muted border border-white/10 rounded-[2rem] p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-serif font-bold text-white">Dashboard anpassen</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <p className="text-white/40 text-sm mb-8">
                Wähle welche Widgets auf deinem Dashboard angezeigt werden sollen.
              </p>

              <div className="space-y-3 mb-8">
                {sortedWidgets.map((widget, index) => (
                  <div
                    key={widget.id}
                    className="flex items-center justify-between p-4 bg-white/[0.03] border border-white/5 rounded-2xl group hover:bg-white/[0.05] transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-white/20 cursor-pointer">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <span className="text-white font-medium">{widget.title}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onMove(widget.id, 'up')}
                        disabled={index === 0}
                        className="p-2 text-white/20 hover:text-white disabled:opacity-20 transition-colors"
                        title="Nach oben"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => onMove(widget.id, 'down')}
                        disabled={index === sortedWidgets.length - 1}
                        className="p-2 text-white/20 hover:text-white disabled:opacity-20 transition-colors"
                        title="Nach unten"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => onToggle(widget.id)}
                        className={`p-2 rounded-xl transition-all ${
                          widget.visible
                            ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            : 'bg-white/5 text-white/20 hover:bg-white/10'
                        }`}
                        title={widget.visible ? 'Ausblenden' : 'Einblenden'}
                      >
                        {widget.visible ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                <button
                  onClick={onReset}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-white/10 rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
                >
                  <RotateCcw className="w-4 h-4" />
                  Zurücksetzen
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 px-4 py-3 bg-white text-black rounded-xl font-bold hover:bg-white/90 transition-all"
                >
                  Fertig
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}