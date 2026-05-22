import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Users, CheckCircle, XCircle, HelpCircle, Clock, Copy, Trash2, Plus, MapPin, Calendar, Send, Train, Download, Hourglass, UserPlus } from "lucide-react";
import { format, parseISO, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import { motion } from "motion/react";
import MapComponent from "../components/MapComponent";
import TransitPlanner from "../components/TransitPlanner";
import { generateVCalendar } from "../lib/calendar";
import { fetchWeather, formatDayLabel, WeatherData } from "../lib/weather";
import { downloadCSV, formatInviteesForCSV } from "../lib/export";

export default function EventDetails() {
  const { id } = useParams();
  if (!id) return <div className="p-8 text-center text-text-dim">Event nicht gefunden</div>;

  const [aktion, setAktion] = useState<any>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [invites, setInvites] = useState<any[]>([]);
  const [persons, setPersons] = useState<any[]>([]);
  const [recentResponses, setRecentResponses] = useState<any[]>([]);
  const [showTransit, setShowTransit] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "participants">("overview");
  const [filter, setFilter] = useState("all");
  const [deleteInviteeId, setDeleteInviteeId] = useState<number | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [editingInvitee, setEditingInvitee] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState("");
  const [editComment, setEditComment] = useState("");
  const [editGuests, setEditGuests] = useState(0);
  const [isAddingParticipant, setIsAddingParticipant] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/events/${id}`).then(r => r.ok ? r.json() : null).then(setAktion).catch(() => {}),
      fetch(`/api/admin/events/${id}/invites`).then(r => r.ok ? r.json() : []).then(setInvites).catch(() => {}),
      fetch("/api/admin/persons").then(r => r.ok ? r.json() : []).then(setPersons).catch(() => {}),
      fetch("/api/admin/recent-responses").then(r => r.ok ? r.json() : []).then(setRecentResponses).catch(() => {}),
    ]);
  }, [id]);

  useEffect(() => {
    if (aktion?.location) {
      fetchWeather(aktion.location, aktion.date).then(setWeather).catch(() => {});
    }
  }, [aktion?.location, aktion?.date]);

  const handleDeleteInvitee = async () => {
    if (!deleteInviteeId) return;
    await fetch(`/api/admin/events/${id}/invites/${deleteInviteeId}`, { method: "DELETE" });
    toast.success("Entfernt");
    setDeleteInviteeId(null);
    setInvites(await fetch(`/api/admin/events/${id}/invites`).then(r => r.ok ? r.json() : []));
  };

  const handleEditInvitee = async () => {
    if (!editingInvitee) return;
    const res = await fetch(`/api/admin/events/${id}/invites/${editingInvitee.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: editStatus, comment: editComment, guests_count: editGuests })
    });
    if (res.ok) {
      toast.success("Gespeichert");
      setEditingInvitee(null);
      setInvites(await fetch(`/api/admin/events/${id}/invites`).then(r => r.ok ? r.json() : []));
    } else {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleAddParticipant = async () => {
    if (!selectedPersonId) return;
    await fetch(`/api/admin/events/${id}/invites`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ person_id: Number(selectedPersonId) }) });
    toast.success("Hinzugefügt"); setSelectedPersonId(""); setIsAddingParticipant(false);
    setInvites(await fetch(`/api/admin/events/${id}/invites`).then(r => r.ok ? r.json() : []));
  };

  if (!aktion) return <div className="min-h-screen bg-surface flex items-center justify-center"><span className="w-5 h-5 border-2 border-text-dim/20 border-t-accent rounded-full animate-spin" /></div>;

  const yes = invites.filter(i => i.status === "yes");
  const no = invites.filter(i => i.status === "no");
  const maybe = invites.filter(i => i.status === "maybe");
  const pend = invites.filter(i => !i.status || i.status === "pending");
  const filteredInvites = filter === "all" ? invites : filter === "yes" ? yes : filter === "no" ? no : filter === "maybe" ? maybe : pend;
  const stat = (icon: any, label: string, val: number) => ({ icon, label, val });
  const getStatusIcon = (s: string) => {
    if (s === "yes") return <CheckCircle className="w-3.5 h-3.5 text-success" />;
    if (s === "no") return <XCircle className="w-3.5 h-3.5 text-danger" />;
    if (s === "maybe") return <HelpCircle className="w-3.5 h-3.5 text-warning" />;
    return <Hourglass className="w-3.5 h-3.5 text-text-dim" />;
  };
  const inviteLink = (() => {
    // Find any pending/unresponded invite to get a valid token
    const pending = invites.find(i => !i.status || i.status === "pending");
    if (pending?.token) return window.location.origin + "/invite/" + pending.token;
    if (invites.length > 0 && invites[0]?.token) return window.location.origin + "/invite/" + invites[0].token;
    return "";
  })();

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4">
      {/* Back */}
      <div className="flex items-center justify-between mb-4 pt-4">
        <Link to="/" className="flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs text-text-dim hover:text-text transition-colors"><ArrowLeft className="w-3.5 h-3.5" /> Zurück</Link>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadCSV(formatInviteesForCSV(invites, aktion.title), `teilnehmer-${aktion.id}.csv`)}
            className="w-9 h-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90"><Download className="w-4 h-4" /></button>
          <button onClick={() => setShowTransit(true)}
            className="w-9 h-9 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90"><Train className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Event Header */}
      <div className="bg-surface-muted border border-border rounded-2xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-text truncate">{aktion.title}</h1>
            <div className="flex items-center gap-3 text-xs text-text-dim mt-2 flex-wrap">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{format(parseISO(aktion.date), "EEEE, dd. MMM yyyy · HH:mm", { locale: de })}</span>
              {aktion.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{aktion.location}</span>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <span className="text-lg font-bold text-text">{yes.length}</span>
            <span className="text-xs text-text-dim">/{invites.length}</span>
          </div>
        </div>
        {aktion.response_deadline && (
          <div className="flex items-center gap-2 mt-3 text-xs text-text-dim bg-surface-elevated rounded-xl px-3 py-2 border border-border w-fit">
            <Clock className="w-3.5 h-3.5" /> Frist: {format(parseISO(aktion.response_deadline), "dd.MM. HH:mm")}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 flex-wrap mb-4">
        {[{ icon: CheckCircle, label: "Dabei", val: yes.length },
          { icon: XCircle, label: "Nein", val: no.length },
          { icon: HelpCircle, label: "?", val: maybe.length },
          { icon: Hourglass, label: "Offen", val: pend.length }
        ].filter(s => s.val > 0).map((s, i) => (
          <div key={i} className="flex items-center gap-1.5 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs">
            <s.icon className="w-3.5 h-3.5 text-accent" />
            <span className="font-bold text-text">{s.val}</span>
            <span className="text-text-dim">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-elevated rounded-xl p-1 mb-4">
        {[{ id: "overview", label: "Übersicht", icon: Calendar }, { id: "participants", label: "Teilnehmer", icon: Users }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${activeTab === tab.id ? "bg-surface text-accent border border-border shadow-sm" : "text-text-dim hover:text-text"}`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="space-y-4">
          {weather && (
            <div className="bg-surface-muted border border-border rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3 text-xs text-text-dim"><MapPin className="w-3.5 h-3.5" /> Wetter</div>
              <div className="flex gap-2">
                {[weather.day1, weather.day2, weather.day3].map((day, i) => day ? (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 py-2 rounded-xl bg-surface-elevated border border-border">
                    <span className="text-[8px] font-bold text-text-dim uppercase">{formatDayLabel(day.date, i - 1)}</span>
                    <span className="text-sm font-bold text-text">{day.temp}°</span>
                    <span className="text-[9px] text-text-dim">{day.condition}</span>
                  </div>
                ) : null)}
              </div>
            </div>
          )}

          {aktion.location && (
            <div className="bg-surface-muted border border-border rounded-2xl overflow-hidden">
              <div className="h-44"><MapComponent location={aktion.location} /></div>
              <div className="flex gap-2 p-3">
                <button onClick={() => setShowTransit(true)} className="flex-1 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs font-semibold text-text-dim hover:text-text active:scale-95 flex items-center justify-center gap-2"><Train className="w-3.5 h-3.5" /> Anfahrt</button>
                <button onClick={() => generateVCalendar(aktion, window.location.href)} className="flex-1 py-2.5 bg-text text-surface rounded-xl text-xs font-semibold hover:opacity-90 active:scale-95 flex items-center justify-center gap-2"><Calendar className="w-3.5 h-3.5" /> Kalender</button>
              </div>
            </div>
          )}

          {aktion.description && (
            <div className="bg-surface-muted border border-border rounded-2xl p-4"><p className="text-sm text-text-dim italic">{aktion.description}</p></div>
          )}

          {recentResponses.length > 0 && (
            <div className="bg-surface-muted border border-border rounded-2xl p-4">
              <h3 className="text-sm font-bold text-text mb-3">Letzte Rückmeldungen</h3>
              <div className="space-y-2">{[...recentResponses].reverse().slice(0, 8).map((r, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === "yes" ? "bg-success" : r.status === "no" ? "bg-danger" : "bg-warning"}`} />
                  <span className="text-text truncate">{r.name_snapshot}</span>
                  {r.comment && <span className="text-[10px] text-text-dim italic truncate max-w-[100px]">{r.comment}</span>}
                  <span className="text-xs text-text-dim ml-auto">{r.responded_at ? formatDistanceToNow(parseISO(r.responded_at), { addSuffix: true, locale: de }) : "- "}</span>
                </div>
              ))}</div>
            </div>
          )}

          {/* Invite link */}
          <div className="bg-surface-muted border border-border rounded-2xl p-4">
            <h3 className="text-sm font-bold text-text mb-3">Einladungslink</h3>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="flex-1 bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-dim outline-none"
                  placeholder="Erst Personen einladen um Link zu erhalten" />
              <button onClick={() => { 
                if (inviteLink) { navigator.clipboard.writeText(inviteLink); toast.success("Kopiert"); }
                else toast.error("Noch keine Einladungen — erstelle zuerst Einladungen");
              }} className="px-4 py-3 bg-surface-elevated border border-border rounded-xl text-text-dim hover:text-text active:scale-95"><Copy className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Tab */}
      {activeTab === "participants" && (
        <div className="space-y-4">
          {/* Filter + Add */}
          <div className="flex items-center gap-2">
            <div className="flex gap-1 bg-surface-elevated rounded-lg p-0.5 flex-wrap">
              {["all", "yes", "no", "maybe", "pending"].map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${filter === f ? "bg-surface text-accent border border-border shadow-sm" : "text-text-dim hover:text-text"}`}>
                  {f === "all" ? "Alle" : f === "yes" ? "Dabei" : f === "no" ? "Nein" : f === "maybe" ? "?" : "Offen"}
                </button>
              ))}
            </div>
            <button onClick={() => setIsAddingParticipant(!isAddingParticipant)}
              className="ml-auto px-3 py-2 bg-accent text-white rounded-lg text-[10px] font-bold hover:opacity-90 active:scale-95 flex items-center gap-1">
              <UserPlus className="w-3.5 h-3.5" /> Hinzufügen
            </button>
          </div>

          {isAddingParticipant && (
            <div className="bg-surface-muted border border-border rounded-2xl p-4 space-y-3">
              <select value={selectedPersonId} onChange={e => setSelectedPersonId(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40">
                <option value="">Person auswählen...</option>
                {persons.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button onClick={handleAddParticipant} disabled={!selectedPersonId}
                className="w-full py-3 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-20 active:scale-95">Hinzufügen</button>
            </div>
          )}

          <div className="divide-y divide-border/50 bg-surface-muted border border-border rounded-xl overflow-hidden">
            {filteredInvites.length === 0 ? (
              <div className="p-8 text-center text-sm text-text-dim">Keine Teilnehmer</div>
            ) : filteredInvites.map(inv => (
              <div key={inv.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated group">
                {getStatusIcon(inv.status)}
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-text truncate block">{inv.name_snapshot || inv.current_name || "Unbekannt"}</span>
                  {inv.guests_count > 0 && <span className="text-xs text-text-dim">+{inv.guests_count} Gäste</span>}
                  {inv.comment && (
                    <div className="mt-1.5 mr-2">
                      <div className="flex items-start gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
                        <svg className="w-3 h-3 mt-0.5 shrink-0 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h8m-4 4h-4" />
                        </svg>
                        <span className="text-[10px] text-amber-300/90 leading-relaxed whitespace-pre-wrap break-words max-w-[180px]">{inv.comment}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0 self-start mt-2">
                  <button onClick={() => { setEditingInvitee(inv); setEditStatus(inv.status || 'pending'); setEditComment(inv.comment || ''); setEditGuests(inv.guests_count || 0); }}
                    className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  </button>
                  <button onClick={() => setDeleteInviteeId(inv.id)}
                    className="w-8 h-8 rounded-lg bg-danger/10 border border-danger/20 flex items-center justify-center text-danger hover:text-danger active:scale-90">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Participant Modal */}
      {editingInvitee && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center" onClick={() => setEditingInvitee(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-border mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-4">{editingInvitee.name_snapshot || editingInvitee.current_name} bearbeiten</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-text-dim font-bold mb-1.5">Status</label>
                <div className="flex gap-2">
                  {[
                    { value: 'yes', label: 'Dabei', color: 'bg-success', textColor: 'text-success' },
                    { value: 'no', label: 'Nein', color: 'bg-danger', textColor: 'text-danger' },
                    { value: 'maybe', label: '?', color: 'bg-warning', textColor: 'text-warning' },
                    { value: 'pending', label: 'Offen', color: 'bg-text-dim', textColor: 'text-text-dim' },
                  ].map(opt => (
                    <button key={opt.value} onClick={() => setEditStatus(opt.value)}
                      className={`flex-1 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-wider border transition-all ${
                        editStatus === opt.value
                          ? opt.color + ' text-white border-transparent'
                          : 'bg-surface-elevated border-border text-text-dim hover:text-text'
                      }`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-text-dim font-bold mb-1.5">Anmerkung</label>
                <input type="text" value={editComment} onChange={e => setEditComment(e.target.value)}
                  placeholder="Kommentar / Notiz"
                  className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" />
              </div>
              <div>
                <label className="block text-xs text-text-dim font-bold mb-1.5">Gäste</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setEditGuests(Math.max(0, editGuests - 1))}
                    className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90">-</button>
                  <span className="text-lg font-bold text-text w-8 text-center">{editGuests}</span>
                  <button onClick={() => setEditGuests(editGuests + 1)}
                    className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90">+</button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setEditingInvitee(null)}
                  className="flex-1 py-3 bg-surface-elevated border border-border rounded-xl text-sm text-text-dim hover:text-text">Abbrechen</button>
                <button onClick={handleEditInvitee}
                  className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90">Speichern</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteInviteeId && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-center justify-center" onClick={() => setDeleteInviteeId(null)}>
          <div className="bg-surface rounded-2xl p-6 max-w-sm w-full border border-border mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-text mb-2">Teilnehmer entfernen?</h3>
            <p className="text-sm text-text-dim mb-4">Alle Daten dieses Teilnehmers werden gelöscht.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteInviteeId(null)} className="flex-1 py-3 bg-surface-elevated border border-border rounded-xl text-sm text-text-dim hover:text-text">Abbrechen</button>
              <button onClick={handleDeleteInvitee} className="flex-1 py-3 bg-danger text-white rounded-xl text-sm font-bold hover:opacity-90">Löschen</button>
            </div>
          </div>
        </div>
      )}

      <TransitPlanner isOpen={showTransit} onClose={() => setShowTransit(false)}
        destination={aktion.location} destinationName={aktion.location}
        eventStartTime={aktion.date} />
    </div>
  );
}
