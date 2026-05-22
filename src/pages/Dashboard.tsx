import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import PersonDashboard from "./PersonDashboard";
import { Plus, MapPin, Clock, ChevronRight, Edit2, Trash2, Settings, Users, CheckCircle2, Calendar, Archive, Download, Compass, Trophy, Megaphone, Zap } from "lucide-react";
import { motion } from "motion/react";
import { format, parseISO, formatDistanceToNow, differenceInMinutes } from "date-fns";
import { de } from "date-fns/locale";
import toast from "react-hot-toast";
import ConfirmModal from "../components/ConfirmModal";
import { downloadCSV, formatStatsForCSV } from "../lib/export";

export default function Dashboard() {
  const navigate = useNavigate();
  const [aktionen, setAktionen] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingAktion, setEditingAktion] = useState<any>(null);
  const [formData, setFormData] = useState({ title: "", date: "", location: "", meeting_point: "", description: "", response_deadline: "", type: "event" });
  const [stats, setStats] = useState<any>(null);
  const [recentResponses, setRecentResponses] = useState<any[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [showPast, setShowPast] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/admin/events").then(r => r.ok ? r.json() : []).then(setAktionen).catch(() => {}),
      fetch("/api/admin/stats").then(r => r.ok ? r.json() : null).then(setStats).catch(() => {}),
      fetch("/api/admin/recent-responses").then(r => r.ok ? r.json() : []).then(setRecentResponses).catch(() => {}),
      fetch("/api/auth/check").then(r => r.ok ? r.json() : null).then(d => { if (d?.user) setIsAdmin(d.user.role === "admin"); }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingAktion ? `/api/admin/events/${editingAktion.id}` : "/api/admin/events";
    const method = editingAktion ? "PUT" : "POST";
    try {
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Fehler"); }
      toast.success(editingAktion ? "Aktualisiert" : "Erstellt");
      setShowModal(false); setEditingAktion(null);
      setFormData({ title: "", date: "", location: "", meeting_point: "", description: "", response_deadline: "", type: "event" });
      setAktionen(await fetch("/api/admin/events").then(r => r.ok ? r.json() : []));
    } catch (e: any) { toast.error(e.message); }
  };

  const handleArchive = async (id: number, archived: boolean) => {
    await fetch(`/api/admin/events/${id}/archive`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_archived: !archived }) });
    toast.success(archived ? "Wiederhergestellt" : "Archiviert");
    setAktionen(await fetch("/api/admin/events").then(r => r.ok ? r.json() : []));
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/admin/events/${deleteId}`, { method: "DELETE" });
    toast.success("Gelöscht"); setDeleteId(null);
    setAktionen(await fetch("/api/admin/events").then(r => r.ok ? r.json() : []));
  };

  if (loading) return <div className="min-h-screen bg-surface flex items-center justify-center"><span className="w-5 h-5 border-2 border-text-dim/20 border-t-accent rounded-full animate-spin" /></div>;
  if (!isAdmin) return <PersonDashboard />;

  const now = new Date();
  const upcoming = aktionen.filter(e => !e.is_archived && new Date(e.date) >= now).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = aktionen.filter(e => !e.is_archived && new Date(e.date) < now).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const archived = aktionen.filter(e => e.is_archived);
  const typeIcons: Record<string, any> = { wanderung: Compass, sport: Trophy, demo: Megaphone, spontan: Zap };
  const typeLabels: Record<string, string> = { wanderung: "Wanderung", sport: "Sport", demo: "Demo", spontan: "Spontan" };

  return (
    <div className="pb-28 max-w-2xl mx-auto px-4">
      <div className="flex items-center justify-between mb-6 pt-4">
        <div>
          <h1 className="text-xl font-bold text-text">Aktionen</h1>
          <p className="text-xs text-text-dim mt-0.5">{upcoming.length} kommende · {stats?.total_events || aktionen.length} gesamt</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => downloadCSV(formatStatsForCSV(stats), "aktionen.csv")}
            className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90"><Download className="w-4 h-4" /></button>
          <button onClick={() => navigate("/einstellungen")}
            className="w-10 h-10 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90"><Settings className="w-4 h-4" /></button>
          <button onClick={() => { setEditingAktion(null); setFormData({ title: "", date: "", location: "", meeting_point: "", description: "", response_deadline: "", type: "event" }); setShowModal(true); }}
            className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 active:scale-90"><Plus className="w-5 h-5" /></button>
        </div>
      </div>

      {stats && (
        <div className="flex items-center gap-2 flex-wrap mb-5">
          {[{ icon: Calendar, label: "Aktionen", val: stats.total_events || upcoming.length },
            { icon: Users, label: "Einladungen", val: stats.total_invitees || "-" },
            { icon: CheckCircle2, label: "Zusagen", val: stats.total_yes || "-" }].map((s, i) => (
            <div key={i} className="flex items-center gap-1.5 px-3 py-2 bg-surface-elevated border border-border rounded-xl text-xs">
              <s.icon className="w-3.5 h-3.5 text-accent" />
              <span className="font-bold text-text">{s.val}</span>
              <span className="text-text-dim">{s.label}</span>
            </div>
          ))}
        </div>
      )}

      <section className="mb-6">
        <h2 className="text-sm font-bold text-text mb-3">
          Kommend{upcoming.length > 0 && <span className="text-xs text-text-dim ml-2 bg-surface-elevated border border-border rounded-full px-2 py-0.5">{upcoming.length}</span>}
        </h2>
        <div className="space-y-2">
          {upcoming.length === 0 && (
            <div className="text-center py-12 text-text-dim text-sm border border-dashed border-border rounded-2xl"><Plus className="w-6 h-6 mx-auto mb-2 opacity-30" />Noch keine Aktionen</div>
          )}
          {upcoming.map(akt => {
            const typeLbl = typeLabels[akt.type] || "Aktion";
            return (
              <Link key={akt.id} to={`/events/${akt.id}`}
                className="flex items-center gap-3 p-3.5 bg-surface-muted border border-border rounded-2xl hover:border-accent/30 hover:bg-surface-elevated transition-all group active:scale-[0.99]">
                <div className="w-12 h-12 shrink-0 bg-surface-elevated rounded-xl flex flex-col items-center justify-center border border-border">
                  <span className="text-[8px] font-bold text-accent uppercase">{format(parseISO(akt.date), "MMM", { locale: de })}</span>
                  <span className="text-base font-bold text-text">{format(parseISO(akt.date), "dd")}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider">{typeLbl}</span>
                    {akt.yes_count > 0 && <span className="text-[10px] text-success font-semibold">{akt.yes_count} Zusagen</span>}
                  </div>
                  <h3 className="text-sm font-bold text-text truncate group-hover:text-accent">{akt.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-text-dim mt-0.5">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{format(parseISO(akt.date), "HH:mm")}</span>
                    {akt.location && <span className="flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" />{akt.location}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Archive className="w-4 h-4 text-text-dim hover:text-blue-400 cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleArchive(akt.id, !!akt.is_archived); }} />
                  <Edit2 className="w-3.5 h-3.5 text-text-dim hover:text-text cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingAktion(akt); setFormData({ title: akt.title, date: akt.date, location: akt.location, meeting_point: akt.meeting_point || "", description: akt.description || "", response_deadline: akt.response_deadline || "", type: akt.type || "event" }); setShowModal(true); }} />
                  <Trash2 className="w-3.5 h-3.5 text-text-dim hover:text-danger cursor-pointer" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteId(akt.id); }} />
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {past.length > 0 && (
        <section className="mb-6">
          <button onClick={() => setShowPast(!showPast)} className="flex items-center gap-2 text-sm font-semibold text-text-dim hover:text-text mb-2">
            Vergangen <span className="text-xs bg-surface-elevated border border-border rounded-full px-2 py-0.5">{past.length}</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showPast ? "rotate-90" : ""}`} />
          </button>
          {showPast && (
            <div className="divide-y divide-border/50 bg-surface-muted border border-border rounded-xl overflow-hidden">
              {past.map(akt => (
                <Link key={akt.id} to={`/events/${akt.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated group">
                  <span className="text-xs text-text-dim font-mono w-20 shrink-0">{format(parseISO(akt.date), "dd.MM.yy")}</span>
                  <span className="flex-1 text-sm text-text-muted group-hover:text-text truncate">{akt.title}</span>
                  <span className="text-xs text-text-dim">{akt.yes_count || 0} Zusagen</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {archived.length > 0 && (
        <section className="mb-6">
          <button onClick={() => setShowArchived(!showArchived)} className="flex items-center gap-2 text-sm font-semibold text-text-dim hover:text-text mb-2">
            Archiv <span className="text-xs bg-surface-elevated border border-border rounded-full px-2 py-0.5">{archived.length}</span>
            <ChevronRight className={`w-3 h-3 transition-transform ${showArchived ? "rotate-90" : ""}`} />
          </button>
          {showArchived && (
            <div className="divide-y divide-border/50 bg-surface-muted border border-border rounded-xl overflow-hidden opacity-70">
              {archived.map(akt => (
                <Link key={akt.id} to={`/events/${akt.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-elevated group">
                  <span className="text-xs text-text-dim font-mono w-20 shrink-0">{format(parseISO(akt.date), "dd.MM.yy")}</span>
                  <span className="flex-1 text-sm text-text-muted group-hover:text-text truncate">{akt.title}</span>
                  <Archive onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleArchive(akt.id, !!akt.is_archived); }}
                    className="w-4 h-4 text-blue-400 hover:text-blue-300 cursor-pointer shrink-0 transition-colors" title="Wiederherstellen" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {recentResponses.length > 0 && (
        <section className="mb-6">
          <h2 className="text-sm font-bold text-text mb-3">Letzte R\u00fcckmeldungen</h2>
          <div className="divide-y divide-border/50 bg-surface-muted border border-border rounded-xl overflow-hidden">
            {recentResponses.slice(0, 5).map((r, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <span className={`w-2 h-2 rounded-full shrink-0 ${r.status === "yes" ? "bg-success" : r.status === "no" ? "bg-danger" : "bg-warning"}`} />
                <span className="text-sm text-text truncate">{r.person_name}</span>
                <span className="text-xs text-text-dim truncate">{r.event_title}</span>
                <span className="text-[10px] text-text-dim">{r.comment ? r.comment : ""}</span>
                  <span className="text-[10px] text-text-dim ml-auto">{r.responded_at ? formatDistanceToNow(parseISO(r.responded_at), { addSuffix: true, locale: de }) : "- "}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center" onClick={() => setShowModal(false)}>
          <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="w-full sm:max-w-lg bg-surface rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-border"
            onClick={e => e.stopPropagation()}>
            <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2 sm:hidden" />
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-text">{editingAktion ? "Bearbeiten" : "Neue Aktion"}</h2>
              <button onClick={() => setShowModal(false)} className="text-text-dim hover:text-text"><Trash2 className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Titel *</label>
                <input required value={formData.title} onChange={e => setFormData(f => ({...f, title: e.target.value}))}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" placeholder="Titel..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Datum *</label>
                  <input type="datetime-local" required value={formData.date} onChange={e => setFormData(f => ({...f, date: e.target.value}))}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40 [color-scheme:dark]" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Typ</label>
                  <select                  value={formData.type} onChange={e => setFormData(f => ({...f, type: e.target.value}))}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40">
                    <option value="event">Aktion</option>
                    <option value="wanderung">Wanderung</option>
                    <option value="sport">Sport</option>
                    <option value="demo">Demo</option>
                    <option value="spontan">Spontan</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Ort</label>
                  <input value={formData.location} onChange={e => setFormData(f => ({...f, location: e.target.value}))}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" placeholder="Ort..." />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Treffpunkt</label>
                  <input value={formData.meeting_point} onChange={e => setFormData(f => ({...f, meeting_point: e.target.value}))}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" placeholder="Optional..." />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Rückmeldefrist</label>
                <input type="datetime-local" value={formData.response_deadline} onChange={e => setFormData(f => ({...f, response_deadline: e.target.value}))}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40 [color-scheme:dark]" />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Beschreibung</label>
                <textarea value={formData.description} onChange={e => setFormData(f => ({...f, description: e.target.value}))}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40 resize-none min-h-[60px]" placeholder="Details..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 bg-surface-elevated border border-border rounded-xl text-sm font-semibold text-text-dim hover:text-text active:scale-[0.98]">Abbrechen</button>
                <button type="submit"
                  className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 active:scale-[0.98] shadow-lg shadow-accent/20">Speichern</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <ConfirmModal isOpen={deleteId !== null} title="Aktion löschen"
        message="Bist du sicher? Alle damit verbundenen Daten werden gelöscht."
        onConfirm={handleDelete} onCancel={() => setDeleteId(null)} />
    </div>
  );
}
