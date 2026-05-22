import { motion } from 'motion/react';
import { CheckCircle, XCircle, HelpCircle, Hourglass } from 'lucide-react';

interface EventStatsProps {
  stats: { yes: number; no: number; maybe: number; pending: number; total: number };
}

export default function EventStats({ stats }: EventStatsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 px-2 sm:px-0">
      {[
        { label: 'Dabei', count: stats.yes, total: stats.total, color: 'emerald', icon: CheckCircle },
        { label: 'Vielleicht', count: stats.maybe, total: stats.total, color: 'amber', icon: HelpCircle },
        { label: 'Abgesagt', count: stats.no, total: stats.total, color: 'red', icon: XCircle },
        { label: 'Offen', count: stats.pending, total: stats.total, color: 'blue', icon: Hourglass }
      ].map((s) => (
        <div key={s.label} className="bg-surface-muted p-6 rounded-[2.5rem] border border-white/5 flex flex-col gap-6 group hover:bg-surface-elevated transition-colors">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{s.label}</div>
            <s.icon className={`w-3.5 h-3.5 text-${s.color}-400/30 group-hover:text-${s.color}-400 transition-colors`} />
          </div>
          <div className="flex items-baseline gap-2">
            <div className={`text-4xl font-serif font-bold text-white tracking-tighter`}>{s.count}</div>
            <div className="text-[10px] font-bold text-white/20">
              {s.total > 0 ? Math.round((s.count / s.total) * 100) : 0}%
            </div>
          </div>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${s.total > 0 ? (s.count / s.total) * 100 : 0}%` }}
              className={`h-full bg-${s.color}-500 transition-all`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
