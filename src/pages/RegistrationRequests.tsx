import React, { useState, useEffect } from 'react';
import { UserPlus, CheckCircle, XCircle, Trash2, Clock, User, ShieldCheck, Copy } from 'lucide-react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import MembersSubNav from '../components/MembersSubNav';

export default function RegistrationRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch('/api/admin/registration-requests');
      if (res.ok) setRequests(await res.json());
    } catch (e) {
      toast.error('Fehler beim Laden der Anfragen');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        toast.success('Anfrage genehmigt');
        fetchRequests();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Fehler beim Genehmigen');
      }
    } catch (e) {
      toast.error('Fehler beim Genehmigen');
    }
  };

  const handleReject = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/registration-requests/${id}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (res.ok) {
        toast.success('Anfrage abgelehnt');
        fetchRequests();
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Fehler beim Ablehnen');
      }
    } catch (e) {
      toast.error('Fehler beim Ablehnen');
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const res = await fetch(`/api/admin/registration-requests/${deleteId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        toast.success('Anfrage gelöscht');
        setDeleteId(null);
        fetchRequests();
      }
    } catch (e) {
      toast.error('Fehler beim Löschen');
    }
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(link);
    toast.success('Registrierungslink kopiert!');
  };

  const pendingCount = requests.filter(
    (r: any) => !r.status || r.status === 'pending',
  ).length;

  if (isLoading)
    return (
      <div className="pb-32">
        <MembersSubNav pendingCount={pendingCount} />
        <div className="p-8 text-center text-white/50 font-serif">Lade Anfragen...</div>
      </div>
    );

  return (
    <div className="pb-32">
      <MembersSubNav pendingCount={pendingCount} />
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-10 mb-16">
        <div className="space-y-2">
          <h1 className="text-5xl sm:text-6xl font-display font-medium text-white tracking-tighter leading-none">Anfragen</h1>
          <p className="text-white/30 font-medium text-lg tracking-tight">Prüfe und verwalte neue Mitgliedsanfragen.</p>
        </div>
        <div className="w-16 h-16 bg-surface-elevated border border-white/10 rounded-[2rem] flex items-center justify-center shadow-2xl relative overflow-hidden group">
          <UserPlus className="w-8 h-8 text-white/40 group-hover:scale-110 transition-transform duration-500 relative z-10" />
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
        </div>
      </div>

      <div className="bg-surface-muted rounded-[3rem] shadow-2xl border border-white/5 overflow-hidden">
        <div className="divide-y divide-white/5 px-2">
          {requests.map((request, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }} 
              key={request.id} 
              className="p-6 sm:p-10 flex flex-col lg:flex-row lg:items-center justify-between hover:bg-white/[0.03] gap-10 transition-all duration-500 group relative rounded-[2rem] mx-2 my-1"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-8">
                <div className={`w-20 h-20 shrink-0 rounded-[2.2rem] flex items-center justify-center text-3xl font-bold font-serif shadow-2xl group-hover:scale-105 transition-all duration-500 relative overflow-hidden ${
                  request.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                  request.status === 'rejected' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/10' :
                  'bg-surface-elevated text-white/20 border border-white/10'
                }`}>
                  <div className="relative z-10">{request.name.charAt(0).toUpperCase()}</div>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-50" />
                </div>
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <h3 className="font-serif text-3xl sm:text-4xl text-white tracking-tighter font-bold">{request.name}</h3>
                    {request.status === 'approved' && (
                      <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-black px-3 py-1.5 rounded-full border border-emerald-500/10 uppercase tracking-widest">Genehmigt</span>
                    )}
                    {request.status === 'rejected' && (
                      <span className="bg-rose-500/10 text-rose-400 text-[9px] font-black px-3 py-1.5 rounded-full border border-rose-500/10 uppercase tracking-widest">Abgelehnt</span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
                    <div className="flex items-center gap-3 text-white/20 text-[10px] font-black uppercase tracking-[0.2em]">
                      <Clock className="w-3.5 h-3.5" />
                      {format(parseISO(request.created_at), 'dd. MMMM yyyy HH:mm', { locale: de })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                {request.status === 'pending' ? (
                  <>
                    <button 
                      onClick={() => handleReject(request.id)}
                      className="px-8 py-5 border border-white/5 text-white/20 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                    >
                      Ablehnen
                    </button>
                    <button 
                      onClick={() => handleApprove(request.id)}
                      className="px-10 py-5 bg-white text-black hover:bg-white/90 rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all shadow-2xl active:scale-95"
                    >
                      Genehmigen
                    </button>
                  </>
                ) : (
                  <>
                    {request.status === 'approved' && request.code && (
                      <button 
                        onClick={() => { copyLink(request.code); }}
                        className="flex items-center gap-4 bg-white/5 border border-white/10 px-8 py-5 rounded-[1.5rem] text-white hover:bg-white/10 transition-all group/code active:scale-95"
                      >
                        <span className="text-[10px] font-mono font-bold tracking-wide text-white/40 group-hover/code:text-white transition-colors break-all text-left leading-relaxed">{request.code}</span>
                        <Copy className="w-4 h-4 text-white/20 group-hover/code:text-white transition-colors shrink-0" />
                      </button>
                    )}
                    <button 
                      onClick={() => setDeleteId(request.id)}
                      className="w-14 h-14 flex items-center justify-center text-white/10 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
          {requests.length === 0 && (
            <div className="py-32 px-10 text-center">
              <div className="w-24 h-24 bg-white/[0.02] rounded-[3rem] flex items-center justify-center mx-auto mb-10 border border-white/5 shadow-2xl">
                <ShieldCheck className="w-10 h-10 text-white/10" />
              </div>
              <p className="text-white/20 font-serif text-2xl tracking-tight">Keine neuen Anfragen.</p>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal 
        isOpen={deleteId !== null}
        title="Anfrage löschen"
        message="Möchtest du diese Registrierungsanfrage wirklich löschen?"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
