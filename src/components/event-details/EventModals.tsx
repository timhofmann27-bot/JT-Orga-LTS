import React from 'react';
import { motion } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Calendar, Compass, Trophy, Megaphone, Zap, CheckCircle, Users, Plus, Trash2, Edit2 } from 'lucide-react';
import ConfirmModal from '../ConfirmModal';
import TransitPlanner from '../TransitPlanner';

interface EventModalsProps {
  id: string;
  deleteInviteeId: number | null;
  setDeleteInviteeId: (id: number | null) => void;
  handleDeleteInvitee: () => void;
  showStepModal: boolean;
  setShowStepModal: (show: boolean) => void;
  editingStep: any;
  stepFormData: { name: string; message: string; scheduled_at: string };
  setStepFormData: (data: any) => void;
  handleSaveStep: (e: React.FormEvent) => void;
  showEditModal: boolean;
  setShowEditModal: (show: boolean) => void;
  formData: { title: string; date: string; location: string; meeting_point: string; description: string; response_deadline: string; type: string };
  setFormData: (data: any) => void;
  handleEditSubmit: (e: React.FormEvent) => void;
  showBulkInviteModal: boolean;
  setShowBulkInviteModal: (show: boolean) => void;
  selectedPersonIds: number[];
  setSelectedPersonIds: (ids: number[]) => void;
  availablePersons: any[];
  handleBulkInvite: () => void;
  showChecklistModal: boolean;
  setShowChecklistModal: (show: boolean) => void;
  checklistFormData: { item_name: string; notes: string };
  setChecklistFormData: (data: any) => void;
  handleSaveChecklistItem: (e: React.FormEvent) => void;
  showPollModal: boolean;
  setShowPollModal: (show: boolean) => void;
  pollFormData: { question: string; options: string[] };
  setPollFormData: (data: any) => void;
  handleCreatePoll: (e: React.FormEvent) => void;
  showTransit: boolean;
  setShowTransit: (show: boolean) => void;
  aktion: any;
}

export default function EventModals({
  id,
  deleteInviteeId,
  setDeleteInviteeId,
  handleDeleteInvitee,
  showStepModal,
  setShowStepModal,
  editingStep,
  stepFormData,
  setStepFormData,
  handleSaveStep,
  showEditModal,
  setShowEditModal,
  formData,
  setFormData,
  handleEditSubmit,
  showBulkInviteModal,
  setShowBulkInviteModal,
  selectedPersonIds,
  setSelectedPersonIds,
  availablePersons,
  handleBulkInvite,
  showChecklistModal,
  setShowChecklistModal,
  checklistFormData,
  setChecklistFormData,
  handleSaveChecklistItem,
  showPollModal,
  setShowPollModal,
  pollFormData,
  setPollFormData,
  handleCreatePoll,
  showTransit,
  setShowTransit,
  aktion
}: EventModalsProps) {
  return (
    <>
      <ConfirmModal 
        isOpen={deleteInviteeId !== null}
        title="Einladung löschen"
        message="Möchtest du diese Einladung wirklich löschen? Der Link wird ungültig und die Antwort der Person geht verloren."
        onConfirm={handleDeleteInvitee}
        onCancel={() => setDeleteInviteeId(null)}
      />

      {showStepModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 sm:p-6 z-[100] backdrop-blur-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-w-md w-full p-8 sm:p-12 max-h-[90dvh] overflow-y-auto"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <h2 className="text-4xl font-serif font-bold mb-10 text-white tracking-tighter shrink-0">{editingStep ? 'Schritt' : 'Neu'} <span className="text-white/30">Workflows</span></h2>
            <form onSubmit={handleSaveStep} className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Name</label>
                <input required type="text" placeholder="z.B. Erste Einladung" value={stepFormData.name} onChange={e => setStepFormData({...stepFormData, name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white outline-none focus:ring-2 focus:ring-white/10 transition-all font-serif text-xl" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Nachricht</label>
                <textarea required placeholder="Deine Nachricht..." value={stepFormData.message} onChange={e => setStepFormData({...stepFormData, message: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white outline-none focus:ring-2 focus:ring-white/10 transition-all text-base leading-relaxed min-h-[150px] resize-none" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Geplant (optional)</label>
                <input type="datetime-local" value={stepFormData.scheduled_at} onChange={e => setStepFormData({...stepFormData, scheduled_at: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white outline-none focus:ring-2 focus:ring-white/10 transition-all [color-scheme:dark]" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="button" onClick={() => setShowStepModal(false)} className="w-full sm:flex-1 h-16 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest">Abbrechen</button>
                <button type="submit" className="w-full sm:flex-1 h-16 bg-white text-black rounded-2xl font-black hover:bg-white/90 transition-all text-xs uppercase tracking-widest shadow-2xl shadow-white/10">Speichern</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showEditModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 sm:p-6 z-[100] backdrop-blur-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-w-xl w-full p-8 sm:p-12 max-h-[95vh] overflow-y-auto relative overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <h2 className="text-4xl sm:text-5xl font-serif font-bold mb-12 text-white tracking-tighter">Event <span className="text-white/30">Bearbeiten</span></h2>
            <form onSubmit={handleEditSubmit} className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Titel</label>
                <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:ring-2 focus:ring-white/20 outline-none transition-all text-2xl font-serif" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-extrabold text-white/20 uppercase tracking-[0.3em] ml-1">Typ der Aktion</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {[
                    { id: 'event', label: 'Standard', icon: Calendar },
                    { id: 'wanderung', label: 'Wanderung', icon: Compass },
                    { id: 'sport', label: 'Sport', icon: Trophy },
                    { id: 'demo', label: 'Demo', icon: Megaphone },
                    { id: 'spontan', label: 'Spontan', icon: Zap }
                  ].map(type => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({...formData, type: type.id})}
                      className={`flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all ${
                        formData.type === type.id 
                        ? 'bg-white border-white text-black shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      <type.icon className="w-5 h-5" />
                      <span className="text-[9px] font-black uppercase tracking-widest leading-none text-center h-4 flex items-center">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Datum & Uhrzeit</label>
                  <input required type="datetime-local" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all [color-scheme:dark]" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Ort</label>
                  <input required type="text" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all" />
                </div>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Treffpunkt</label>
                <input type="text" value={formData.meeting_point} onChange={e => setFormData({...formData, meeting_point: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Beschreibung</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all min-h-[150px] resize-none" />
              </div>
              <div className="space-y-4 p-8 bg-white/[0.02] border border-white/5 rounded-3xl">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] ml-1">Antwortfrist</label>
                <input type="datetime-local" value={formData.response_deadline} onChange={e => setFormData({...formData, response_deadline: e.target.value})} className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 text-white focus:ring-2 focus:ring-white/20 outline-none transition-all [color-scheme:dark]" />
                <p className="text-[10px] text-white/20 mt-4 leading-relaxed tracking-wider">Nach Ablauf dieser Frist können Teilnehmer ihren Status im System nicht mehr selbstständig ändern.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-10">
                <button type="button" onClick={() => setShowEditModal(false)} className="w-full sm:flex-1 h-16 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest">Abbrechen</button>
                <button type="submit" className="w-full sm:flex-1 h-16 bg-white text-black rounded-2xl font-black hover:bg-white/90 transition-all text-xs uppercase tracking-widest shadow-2xl shadow-white/10">Änderungen speichern</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showBulkInviteModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 sm:p-6 z-[100] backdrop-blur-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-w-md w-full p-8 sm:p-12 max-h-[95vh] flex flex-col relative overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <h2 className="text-4xl font-serif font-bold mb-10 text-white tracking-tighter">Mitglieder <span className="text-white/30">Einladen</span></h2>
            
            <div className="flex justify-between items-center mb-8 px-2">
              <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">{selectedPersonIds.length} von {availablePersons.length} gewählt</span>
              <button 
                onClick={() => setSelectedPersonIds(selectedPersonIds.length === availablePersons.length ? [] : availablePersons.map(p => p.id))}
                className="text-[10px] text-white/40 font-black hover:text-white transition-colors uppercase tracking-[0.2em]"
              >
                {selectedPersonIds.length === availablePersons.length ? 'Niemand' : 'Alle'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto border border-white/5 rounded-[2.5rem] divide-y divide-white/5 mb-10 bg-white/[0.02] shadow-inner">
              {availablePersons.map(p => (
                <label key={p.id} className="flex items-center gap-6 p-6 hover:bg-white/[0.05] cursor-pointer transition-all group relative active:bg-white/[0.08]">
                  <div className="relative flex items-center justify-center">
                    <input 
                      type="checkbox" 
                      checked={selectedPersonIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedPersonIds([...selectedPersonIds, p.id]);
                        else setSelectedPersonIds(selectedPersonIds.filter(id => id !== p.id));
                      }}
                      className="w-7 h-7 rounded-xl border-white/10 bg-black/50 text-white focus:ring-white/10 focus:ring-offset-black transition-all cursor-pointer appearance-none checked:bg-white checked:border-white"
                    />
                    {selectedPersonIds.includes(p.id) && (
                      <div className="absolute pointer-events-none">
                        <CheckCircle className="w-4 h-4 text-black" />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-serif text-2xl text-white group-hover:scale-105 transition-transform origin-left tracking-tight font-bold">{p.name}</span>
                    <span className="text-[10px] text-white/20 font-black uppercase tracking-widest mt-1">Mitglied</span>
                  </div>
                </label>
              ))}
              {availablePersons.length === 0 && (
                <div className="p-20 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <Users className="w-8 h-8 text-white/10" />
                  </div>
                  <p className="text-white/30 font-serif text-lg">Keine weiteren Personen verfügbar.</p>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <button onClick={() => setShowBulkInviteModal(false)} className="w-full sm:flex-1 h-16 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest active:scale-95">Abbrechen</button>
              <button 
                onClick={handleBulkInvite} 
                disabled={selectedPersonIds.length === 0}
                className="w-full sm:flex-1 h-16 bg-white text-black rounded-2xl font-black hover:bg-white/90 transition-all disabled:opacity-20 disabled:cursor-not-allowed text-xs uppercase tracking-widest shadow-2xl active:scale-95"
              >
                Einladungen senden
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <TransitPlanner 
        isOpen={showTransit}
        onClose={() => setShowTransit(false)}
        destination={aktion?.location}
        destinationName={aktion?.location}
        eventStartTime={aktion?.date}
      />

      {showChecklistModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 sm:p-6 z-[100] backdrop-blur-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-w-md w-full p-8 sm:p-12 relative overflow-hidden"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <h2 className="text-4xl font-serif font-bold mb-10 text-white tracking-tighter">Neuer <span className="text-white/30">Gegenstand</span></h2>
            <form onSubmit={handleSaveChecklistItem} className="space-y-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Was wird gebraucht?</label>
                <input required type="text" placeholder="z.B. Grillkohle" value={checklistFormData.item_name} onChange={e => setChecklistFormData({...checklistFormData, item_name: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white outline-none focus:ring-2 focus:ring-white/10 transition-all font-serif text-xl" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Notizen (optional)</label>
                <input type="text" placeholder="z.B. Marke egal" value={checklistFormData.notes} onChange={e => setChecklistFormData({...checklistFormData, notes: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white outline-none focus:ring-2 focus:ring-white/10 transition-all" />
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button type="button" onClick={() => setShowChecklistModal(false)} className="w-full sm:flex-1 h-16 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest">Abbrechen</button>
                <button type="submit" className="w-full sm:flex-1 h-16 bg-white text-black rounded-2xl font-black hover:bg-white/90 transition-all text-xs uppercase tracking-widest shadow-2xl shadow-white/10">Speichern</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {showPollModal && (
        <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center p-4 sm:p-6 z-[100] backdrop-blur-2xl">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-surface border-t sm:border border-white/10 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl max-w-md w-full p-8 sm:p-12 relative overflow-hidden h-[90vh] flex flex-col"
          >
            <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-10 sm:hidden" />
            <h2 className="text-4xl font-serif font-bold mb-10 text-white tracking-tighter shrink-0">Neue <span className="text-white/30">Umfrage</span></h2>
            <form onSubmit={handleCreatePoll} className="space-y-10 flex-1 overflow-y-auto pr-2">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Frage</label>
                <input required type="text" placeholder="Was wollen wir machen?" value={pollFormData.question} onChange={e => setPollFormData({...pollFormData, question: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 text-white outline-none focus:ring-2 focus:ring-white/10 transition-all font-serif text-xl" />
              </div>
              <div className="space-y-6">
                <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-1">Optionen</label>
                <div className="space-y-3">
                  {pollFormData.options.map((opt, i) => (
                    <input 
                      key={i} 
                      type="text" 
                      placeholder={`Option ${i+1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...pollFormData.options];
                        newOpts[i] = e.target.value;
                        setPollFormData({...pollFormData, options: newOpts});
                      }}
                      className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:ring-2 focus:ring-white/10 transition-all"
                    />
                  ))}
                </div>
                <button 
                  type="button" 
                  onClick={() => setPollFormData({...pollFormData, options: [...pollFormData.options, '']})}
                  className="text-[10px] font-bold text-white/30 hover:text-white uppercase tracking-widest flex items-center gap-2"
                >
                  <Plus className="w-3 h-3" /> Option hinzufügen
                </button>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 pt-10 sticky bottom-0 bg-surface pb-4 pb-safe">
                <button type="button" onClick={() => setShowPollModal(false)} className="w-full sm:flex-1 h-16 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/5 transition-all text-xs uppercase tracking-widest">Abbrechen</button>
                <button type="submit" className="w-full sm:flex-1 h-16 bg-white text-black rounded-2xl font-black hover:bg-white/90 transition-all text-xs uppercase tracking-widest shadow-2xl shadow-white/10">Erstellen</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
}
