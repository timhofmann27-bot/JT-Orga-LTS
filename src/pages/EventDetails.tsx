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
  const inviteLink = `${window.location.origin}/invite/${invites[0]?.token || ""}`;

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
                  <span className="text-text truncate">{r.person_name}</span>
                  <span className="text-xs text-text-dim ml-auto">{r.responded_at ? formatDistanceToNow(parseISO(r.responded_at), { addSuffix: true, locale: de }) : "- "}</span>
                </div>
              ))}</div>
            </div>
          )}

          {/* Invite link */}
          <div className="bg-surface-muted border border-border rounded-2xl p-4">
            <h3 className="text-sm font-bold text-text mb-3">Einladungslink</h3>
            <div className="flex gap-2">
              <input readOnly value={inviteLink} className="flex-1 bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text-dim outline-none" />
              <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Kopiert"); }} className="px-4 py-3 bg-surface-elevated border border-border rounded-xl text-text-dim hover:text-text active:scale-95"><Copy className="w-4 h-4" /></button>
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
                  <span className="text-sm font-semibold text-text truncate block">{inv.name}</span>
                  {inv.guests_count > 0 && <span className="text-xs text-text-dim">+{inv.guests_count} Gäste</span>}
                  {inv.comment && <span className="text-xs text-text-dim italic block truncate mt-0.5">{inv.comment}</span>}
                </div>
                <Trash2 onClick={() => setDeleteInviteeId(inv.id)} className="w-4 h-4 text-text-dim hover:text-danger cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
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
