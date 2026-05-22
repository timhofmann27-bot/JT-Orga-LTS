import React from 'react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { Plus, CheckCircle, Trash2, Edit2, MessageSquare, HelpCircle, Send } from 'lucide-react';

interface EventPlanningProps {
  invitationSteps: any[];
  setEditingStep: (step: any) => void;
  setStepFormData: (data: any) => void;
  setShowStepModal: (show: boolean) => void;
  handleTriggerStep: (stepId: number) => void;
  handleDeleteStep: (stepId: number) => void;
  checklist: any[];
  setChecklistFormData: (data: any) => void;
  setShowChecklistModal: (show: boolean) => void;
  handleDeleteChecklistItem: (itemId: number) => void;
  polls: any[];
  setPollFormData: (data: any) => void;
  setShowPollModal: (show: boolean) => void;
  handleDeletePoll: (pollId: number) => void;
  messages: any[];
  newMessage: string;
  setNewMessage: (s: string) => void;
  handlePostMessage: (e: React.FormEvent) => void;
  handleDeleteMessage: (msgId: number) => void;
  aktion: any;
}

export default function EventPlanning({
  invitationSteps,
  setEditingStep,
  setStepFormData,
  setShowStepModal,
  handleTriggerStep,
  handleDeleteStep,
  checklist,
  setChecklistFormData,
  setShowChecklistModal,
  handleDeleteChecklistItem,
  polls,
  setPollFormData,
  setShowPollModal,
  handleDeletePoll,
  messages,
  newMessage,
  setNewMessage,
  handlePostMessage,
  handleDeleteMessage,
  aktion
}: EventPlanningProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      <div className="space-y-10">

        {/* Invitation Steps Card */}
        <div className="bg-surface-muted rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Workflows</h3>
            <button 
              onClick={(e) => { e.stopPropagation(); setEditingStep(null); setStepFormData({ name: '', message: '', scheduled_at: '' }); setShowStepModal(true); }} 
              className="w-10 h-10 bg-white shadow-2xl text-black rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4 relative z-10">
            {invitationSteps.map(step => (
              <div key={step.id} className="bg-white/[0.03] p-6 rounded-[2rem] border border-white/5 group hover:bg-white/[0.05] transition-colors overflow-hidden relative">
                <div className="flex justify-between items-start mb-3">
                  <div className="font-serif text-lg font-bold text-white tracking-tight">{step.name}</div>
                  <div className="flex gap-1">
                    <button onClick={() => { setEditingStep(step); setStepFormData({ name: step.name, message: step.message, scheduled_at: step.scheduled_at || '' }); setShowStepModal(true); }} className="w-11 h-11 flex items-center justify-center text-white/20 hover:text-white transition-colors active:scale-90"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDeleteStep(step.id)} className="w-11 h-11 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors active:scale-90"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="text-xs text-white/30 mb-6 line-clamp-2 font-medium leading-relaxed tracking-tight">{step.message}</div>
                <div className="flex justify-between items-center pt-5 border-t border-white/5">
                  <div className="text-[10px] text-white/20 font-black uppercase tracking-widest">{step.scheduled_at ? format(parseISO(step.scheduled_at), 'dd.MM. HH:mm') : 'Manuell'}</div>
                  {!step.sent_at ? (
                    <button 
                      onClick={() => handleTriggerStep(step.id)} 
                      className="bg-white text-black text-[9px] font-black px-4 py-2 rounded-xl hover:bg-white/90 transition-all uppercase tracking-widest shadow-xl shadow-white/5"
                    >
                      Senden
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/5 px-3 py-1.5 rounded-xl border border-emerald-500/10">
                      <CheckCircle className="w-3 h-3" /> Erledigt
                    </div>
                  )}
                </div>
              </div>
            ))}
            {invitationSteps.length === 0 && (
              <div className="text-center py-10">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <p className="text-white/20 text-xs font-bold uppercase tracking-widest">Keine Schritte</p>
              </div>
            )}
          </div>
        </div>

        {/* Checklist Card */}
        <div className="bg-surface-muted rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Mitbringliste</h3>
            <button 
              onClick={() => { setChecklistFormData({ item_name: '', notes: '' }); setShowChecklistModal(true); }} 
              className="w-10 h-10 bg-white shadow-2xl text-black rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4 relative z-10">
            {checklist.map(item => (
              <div key={item.id} className="bg-white/[0.03] p-5 rounded-2xl border border-white/5 group hover:bg-white/[0.05] transition-colors flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className={`text-sm font-bold tracking-tight ${item.claimer_person_id ? 'text-white/40' : 'text-white'}`}>{item.item_name}</span>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${item.claimer_person_id ? 'text-emerald-400' : 'text-white/10'}`}>
                      {item.claimer_name ? `Besorgt von: ${item.claimer_name}` : 'Offen'}
                    </span>
                  </div>
                  {item.notes && <span className="text-[10px] text-white/20">{item.notes}</span>}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handleDeleteChecklistItem(item.id)} className="w-10 h-10 flex items-center justify-center text-white/10 hover:text-red-400 transition-colors active:scale-90">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {checklist.length === 0 && (
              <div className="text-center py-10 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-5 h-5 text-white/20" />
                </div>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Die Mitbringliste ist noch leer.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-10">
        {/* Polls Card */}
        <div className="bg-surface-muted rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Umfragen</h3>
            <button 
              onClick={() => { setPollFormData({ question: '', options: ['', ''] }); setShowPollModal(true); }} 
              className="w-10 h-10 bg-white shadow-2xl text-black rounded-2xl flex items-center justify-center hover:scale-110 transition-transform active:scale-95"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-6 relative z-10">
            {polls.map(poll => (
              <div key={poll.id} className="p-6 bg-white/[0.03] rounded-3xl border border-white/5">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-serif font-bold text-white text-lg tracking-tight">{poll.question}</h4>
                  <button onClick={() => handleDeletePoll(poll.id)} className="text-white/10 hover:text-red-400 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-2">
                  {poll.options.map((opt: any) => (
                    <div key={opt.id} className="relative h-10 bg-white/5 rounded-xl overflow-hidden border border-white/5">
                      <div 
                        className="absolute inset-y-0 left-0 bg-white/10 transition-all duration-1000"
                        style={{ width: `${poll.options.reduce((a: any, b: any) => a + b.vote_count, 0) > 0 ? (opt.vote_count / poll.options.reduce((a: any, b: any) => a + b.vote_count, 0)) * 100 : 0}%` }}
                      />
                      <div className="relative h-full flex items-center justify-between px-4 text-[10px] font-bold text-white/60 tracking-widest uppercase">
                        <span>{opt.option_text}</span>
                        <span>{opt.vote_count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {polls.length === 0 && (
              <div className="text-center py-10 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <HelpCircle className="w-5 h-5 text-white/20" />
                </div>
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Keine Umfragen erstellt.</p>
              </div>
            )}
          </div>
        </div>
        {/* Message Board */}
        <div className="bg-surface-muted rounded-[3rem] p-8 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="flex justify-between items-center mb-10 relative z-10">
            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em]">Pinnwand</h3>
            <MessageSquare className="w-5 h-5 text-white/20" />
          </div>

          <div className="space-y-4 mb-8">
            {messages.length === 0 ? (
              <div className="text-center py-10 px-4 bg-white/[0.02] rounded-2xl border border-white/5 border-dashed">
                <p className="text-white/30 text-[10px] font-bold uppercase tracking-widest">Noch keine Nachrichten.</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`p-4 rounded-2xl border ${msg.is_admin ? 'bg-white/5 border-white/20' : 'bg-black/40 border-white/5'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold tracking-tight ${msg.is_admin ? 'text-white' : 'text-white/60'}`}>
                        {msg.is_admin ? (aktion?.title || 'Event Team') : msg.person_name}
                      </span>
                      {msg.is_admin && <span className="bg-white text-black px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Orga</span>}
                      <span className="text-white/20 text-[9px] font-bold uppercase tracking-widest">{format(parseISO(msg.created_at), 'dd.MM HH:mm')}</span>
                    </div>
                    <button onClick={() => handleDeleteMessage(msg.id)} className="text-white/10 hover:text-red-400 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          <form onSubmit={handlePostMessage} className="relative z-10">
            <textarea
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Als Orga an die Pinnwand schreiben..."
              className="w-full bg-black/60 border border-white/10 rounded-2xl p-4 pr-14 text-base text-white placeholder:text-white/20 outline-none focus:border-white/30 transition-colors resize-none h-24"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="absolute bottom-4 right-4 w-11 h-11 bg-white text-black rounded-xl flex items-center justify-center disabled:opacity-50 disabled:bg-white/5 disabled:text-white/20 transition-all hover:scale-105 active:scale-95"
            >
              <Send className="w-4 h-4 -ml-0.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
