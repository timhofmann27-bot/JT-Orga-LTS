import React, { useState, useEffect } from 'react';
import { BarChart as BarChartIcon, Calendar, Users, Mail, Archive, TrendingUp } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  Cell
} from 'recharts';

export default function Stats() {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/stats')
      .then(res => res.json())
      .then(data => setStats(data));
  }, []);

  if (!stats) return <div className="p-8 text-center text-text-dim font-serif">Lade Statistik...</div>;

  const chartData = stats.eventBreakdown?.slice(0, 10).reverse().map((e: any) => ({
    name: e.title.length > 20 ? e.title.substring(0, 17) + '...' : e.title,
    fullTitle: e.title,
    Zusagen: e.yes_count,
    Absagen: e.no_count,
    Vielleicht: e.maybe_count,
    Offen: e.pending_count,
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-surface-muted border border-border p-4 rounded-2xl shadow-2xl backdrop-blur-xl">
          <p className="text-text font-serif font-bold mb-2">{payload[0].payload.fullTitle}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-text-muted">{entry.name}:</span>
              <span className="text-text font-bold">{entry.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pb-32 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-6">
        <div className="space-y-2">
          <h1 className="text-xl font-display font-bold text-text tracking-tighter">Statistiken</h1>
          <p className="text-text-muted font-medium text-sm">Übersicht der Event-Performance und Mitgliederaktivität.</p>
        </div>
        <div className="w-12 h-12 bg-surface-elevated border border-border rounded-xl flex items-center justify-center shadow-lg">
          <BarChartIcon className="w-5 h-5 text-accent" />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Aktionen', value: stats.events, icon: Calendar },
          { 
            label: 'Archiviert', 
            value: stats.archived_events, 
            icon: Archive,
            sub: `${Math.round(stats.archived_pct)}%`
          },
          { label: 'Mitglieder', value: stats.persons, icon: Users },
          { label: 'Einladungen', value: stats.invites, icon: Mail }
        ].map((item, i) => (
          <motion.div 
            key={item.label}
            initial={{ opacity: 0, y: 15 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] }} 
            className="bg-surface-muted p-4 rounded-2xl border border-border flex items-center gap-4 group hover:bg-surface-elevated transition-all duration-300"
          >
            <div className="w-12 h-12 bg-surface-elevated rounded-xl flex items-center justify-center shrink-0 border border-border group-hover:border-accent/30 transition-colors">
              <item.icon className="w-5 h-5 text-text-dim group-hover:text-accent transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-text-dim uppercase tracking-widest">{item.label}</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-display font-bold text-text leading-none">{item.value}</span>
                {item.sub && <span className="text-[10px] font-black text-accent bg-accent-muted px-1.5 py-0.5 rounded-md uppercase">{item.sub}</span>}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Chart Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }} 
        className="bg-surface-muted p-5 rounded-3xl border border-border mt-8"
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <div className="space-y-1">
            <h2 className="text-xl font-display font-bold text-text">Antworten-Trend</h2>
            <p className="text-xs font-medium text-text-dim">Letzte 10 Aktionen im Vergleich</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-elevated rounded-lg border border-border">
              <div className="w-2 h-2 rounded-full bg-success" />
              <span className="text-[10px] font-black text-text-dim uppercase">Zusagen</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-elevated rounded-lg border border-border">
              <div className="w-2 h-2 rounded-full bg-warning" />
              <span className="text-[10px] font-black text-text-dim uppercase">Vielleicht</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-elevated rounded-lg border border-border">
              <div className="w-2 h-2 rounded-full bg-danger" />
              <span className="text-[10px] font-black text-text-dim uppercase">Absagen</span>
            </div>
          </div>
        </div>
        
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
              barGap={4}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontWeight: 600 }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'var(--color-text-dim)', fontSize: 10, fontWeight: 600 }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--color-surface-elevated)', opacity: 0.5 }} />
              <Bar 
                dataKey="Zusagen" 
                fill="var(--color-success)" 
                radius={[4, 4, 4, 4]} 
                animationDuration={1500} 
                barSize={10}
              />
              <Bar 
                dataKey="Vielleicht" 
                name="Vielleicht" 
                fill="var(--color-warning)" 
                radius={[4, 4, 4, 4]} 
                animationDuration={1500} 
                barSize={10}
              />
              <Bar 
                dataKey="Absagen" 
                fill="var(--color-danger)" 
                radius={[4, 4, 4, 4]} 
                animationDuration={1500} 
                barSize={10}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </motion.div>
    </div>
  );
}

