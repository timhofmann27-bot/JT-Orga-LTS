import React from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Users, Copy, Trash2, Send, Plus, Download, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { downloadCSV, formatInviteesForCSV } from '../../lib/export';

interface EventParticipantsProps {
  invites: any[];
  filter: string;
  setFilter: (f: string) => void;
  filteredInvitees: any[];
  handleUpdateStatus: (id: number, status: string) => void;
  copyLink: (token: string) => void;
  handleResendInvite: (id: number) => void;
  setDeleteInviteeId: (id: number | null) => void;
  setShowBulkInviteModal: (show: boolean) => void;
  aktion: any;
}

export default function EventParticipants({
  invites,
  filter,
  setFilter,
  filteredInvitees,
  handleUpdateStatus,
  copyLink,
  handleResendInvite,
  setDeleteInviteeId,
  setShowBulkInviteModal,
  aktion
}: EventParticipantsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Main Content: Invites List */}
      <div className="lg:col-span-2 space-y-10">
        <div className="bg-surface-muted rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl">
          <div className="p-8 sm:p-10 border-b border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white/[0.02]">
            <div className="space-y-1">
              <h2 className="text-2xl font-serif font-bold text-white flex items-center gap-3 tracking-tighter">
                Teilnehmer
                <div className="px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-white/30 border border-white/5">
                  {invites.length}
                </div>
              </h2>
              <p className="text-white/30 text-xs font-medium tracking-tight">Status aller versendeten Einladungen</p>
            </div>
            <div className="w-full sm:w-auto">
              <select 
                value={filter} 
                onChange={e => setFilter(e.target.value)}
                className="w-full sm:w-auto border border-white/10 rounded-2xl text-[10px] font-black px-6 py-3 bg-black text-white outline-none focus:ring-2 focus:ring-white/10 transition-all cursor-pointer uppercase tracking-[0.2em] shadow-xl"
              >
                <option value="all">Alle anzeigen</option>
                <option value="yes">Zusagen</option>
                <option value="maybe">Vielleicht</option>
                <option value="no">Absagen</option>
                <option value="pending">Noch offen</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const csvData = formatInviteesForCSV(invites);
                  downloadCSV(csvData, `${aktion?.title || 'Event'}_Teilnehmer`, ['Name', 'Status', 'Gäste', 'Antwort_Datum', 'Erstellt_Am', 'Link']);
                  toast.success('Teilnehmerliste exportiert');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
                title="Teilnehmerliste als CSV exportieren"
              >
                <Download className="w-4 h-4" /> Export
              </button>
            </div>
          </div>

          <div className="divide-y divide-white/5 px-2">
            {filteredInvitees.length > 0 ? (
              filteredInvitees.map((invitee: any) => (
                <div key={invitee.id} className="p-6 hover:bg-white/[0.03] transition-all group rounded-2xl mx-2 my-1">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                    <div className="flex items-center gap-5">
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 font-serif text-xl font-bold shadow-2xl relative overflow-hidden ${
                        invitee.status === 'yes' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/10' :
                        invitee.status === 'no' ? 'bg-red-500/10 text-red-400 border border-red-500/10' :
                        invitee.status === 'maybe' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/10' :
                        'bg-white/5 text-white/20 border border-white/5'
                      }`}>
                        <div className="relative z-10">{(invitee.name_snapshot || invitee.current_name || '?').charAt(0).toUpperCase()}</div>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                      </div>
                      <div className="space-y-1.5">
                        <div className="font-serif text-xl text-white flex items-center gap-3 tracking-tight font-bold">
                          {invitee.name_snapshot || invitee.current_name}
                          {invitee.guests_count > 0 && (
                            <div className="text-[10px] bg-white text-black px-2 py-0.5 rounded-lg font-black tracking-widest shadow-xl">
                              +{invitee.guests_count}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <select 
                            value={invitee.status} 
                            onChange={(e) => handleUpdateStatus(invitee.id, e.target.value)}
                            className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl bg-black border transition-all cursor-pointer outline-none shadow-lg ${
                              invitee.status === 'yes' ? 'text-emerald-400 border-emerald-500/20' :
                              invitee.status === 'no' ? 'text-red-400 border-red-500/20' :
                              invitee.status === 'maybe' ? 'text-amber-400 border-amber-500/20' :
                              'text-white/20 border-white/5'
                            }`}
                          >
                            <option value="pending">Offen</option>
                            <option value="yes">Dabei</option>
                            <option value="maybe">Vielleicht</option>
                            <option value="no">Absagt</option>
                          </select>
                          {invitee.responded_at && (
                            <span className="text-[10px] text-white/10 font-bold uppercase tracking-widest">
                              {format(parseISO(invitee.responded_at), 'dd.MM. HH:mm')}
                            </span>
                          )}
                        </div>
                        {invitee.comment && (
                          <div className="flex items-center gap-2 mt-0.5" title={invitee.comment}>
                            <MessageSquare className="w-3 h-3 text-white/30 shrink-0" />
                            <span className="text-xs text-white/50 italic truncate max-w-[200px] sm:max-w-xs">„{invitee.comment}"</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      <button
                        onClick={() => copyLink(invitee.token)}
                        className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/5 text-white/20 hover:text-white hover:bg-white/10 rounded-2xl transition-all active:scale-90"
                        title="Link kopieren"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleResendInvite(invitee.id)}
                        className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/5 text-white/20 hover:text-white hover:bg-white/10 rounded-2xl transition-all active:scale-90"
                        title="Erinnern"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteInviteeId(invitee.id)}
                        className="w-11 h-11 flex items-center justify-center bg-white/5 border border-white/5 text-white/20 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20 rounded-2xl transition-all active:scale-90"
                        title="Löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-24 text-center">
                <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                  <Users className="w-8 h-8 text-white/10" />
                </div>
                <p className="text-white/30 font-serif text-lg">Keine Teilnehmer gefunden.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Add Person Card */}
        <div className="bg-white rounded-[3rem] p-8 sm:p-10 text-black shadow-2xl relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer" onClick={() => setShowBulkInviteModal(true)}>
          <div className="absolute top-0 right-0 w-40 h-40 bg-black/[0.03] rounded-bl-[5rem] -mr-12 -mt-12 transition-transform group-hover:scale-110" />
          <div className="relative z-10 flex flex-col gap-8">
            <div className="space-y-2">
              <h3 className="text-3xl font-serif font-black tracking-tighter leading-none">Einladen</h3>
              <p className="text-sm text-black/40 font-bold tracking-tight">Netzwerkmitglieder hinzufügen.</p>
            </div>
            <div className="w-14 h-14 bg-black rounded-2xl flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
