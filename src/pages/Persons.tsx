import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  CalendarPlus,
  Search,
  ArrowLeft,
  MoreVertical,
  Mail,
  FileText,
  Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "motion/react";
import ConfirmModal from "../components/ConfirmModal";
import MembersSubNav from "../components/MembersSubNav";

interface Person {
  id: number;
  name: string;
  username?: string;
  notes?: string;
}

const avatarColors = [
  "from-accent to-orange-400",
  "from-red-500 to-rose-400",
  "from-emerald-500 to-green-400",
  "from-violet-600 to-purple-500",
  "from-blue-500 to-sky-400",
  "from-amber-500 to-yellow-400",
  "from-teal-500 to-cyan-400",
  "from-pink-500 to-fuchsia-400",
];

function getColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

/* ═══════════════════════════════════════════════════════
   Person Detail Sheet
   ═══════════════════════════════════════════════════════ */
function PersonDetail({
  person,
  onClose,
  onEdit,
  onDelete,
}: {
  person: Person;
  onClose: () => void;
  onEdit: (p: Person) => void;
  onDelete: (id: number) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-sm bg-surface rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-text-dim hover:text-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onEdit(person)}
              className="w-10 h-10 rounded-full bg-surface-elevated flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-elevated active:scale-90 transition-all"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete(person.id)}
              className="w-10 h-10 rounded-full bg-danger/10 flex items-center justify-center text-danger hover:bg-danger/20 active:scale-90 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Avatar */}
        <div className="flex flex-col items-center py-6">
          <div
            className={`w-24 h-24 rounded-full bg-gradient-to-br ${getColor(person.name)} flex items-center justify-center shadow-lg shadow-black/30 border-2 border-border`}
          >
            <span className="text-3xl font-bold text-white">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h2 className="text-xl font-bold text-text mt-4">{person.name}</h2>
          {person.username && (
            <p className="text-sm text-text-dim mt-1">@{person.username}</p>
          )}
        </div>

        {/* Info rows */}
        <div className="px-6 pb-8 space-y-3">
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-muted border border-border">
            <div className="w-10 h-10 rounded-xl bg-accent-muted flex items-center justify-center">
              <Users className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-xs text-text-dim uppercase tracking-widest font-semibold">
                Mitglied seit
              </p>
              <p className="text-sm text-text mt-0.5">Aktiv</p>
            </div>
          </div>
          {person.notes && (
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-muted border border-border">
              <div className="w-10 h-10 rounded-xl bg-surface-elevated flex items-center justify-center">
                <FileText className="w-5 h-5 text-text-dim" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-dim uppercase tracking-widest font-semibold">
                  Notiz
                </p>
                <p className="text-sm text-text-muted mt-0.5 italic truncate">
                  {person.notes}
                </p>
              </div>
            </div>
          )}
          {!person.notes && (
            <p className="text-center text-text-dim/50 text-sm py-6">
              Keine weiteren Details
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Person Card (iOS Contacts style)
   ═══════════════════════════════════════════════════════ */
function PersonCard({
  person,
  onTap,
  onEdit,
  onDelete,
  index,
}: {
  person: Person;
  onTap: (p: Person) => void;
  onEdit: (p: Person) => void;
  onDelete: (id: number) => void;
  index: number;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.02, duration: 0.25 }}
    >
      <div className="relative">
        <button
          onClick={() => onTap(person)}
          className="w-full flex items-center gap-4 py-3.5 active:bg-surface-muted transition-colors text-left"
        >
          {/* Avatar */}
          <div
            className={`w-14 h-14 rounded-full bg-gradient-to-br ${getColor(person.name)} flex items-center justify-center flex-shrink-0 shadow-sm border-2 border-border`}
          >
            <span className="text-lg font-bold text-white">
              {person.name.charAt(0).toUpperCase()}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-text truncate">
              {person.name}
            </p>
            <p className="text-sm text-text-dim truncate mt-0.5">
              {person.username
                ? `@${person.username}`
                : "Kein Username"}
            </p>
          </div>

          {/* Three dots */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center text-text-dim hover:text-text hover:bg-surface-elevated active:scale-90 transition-all"
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </button>

        {/* Context Menu */}
        <AnimatePresence>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -4 }}
                className="absolute right-4 top-14 z-50 bg-surface-muted border border-border rounded-2xl overflow-hidden shadow-xl min-w-[170px]"
              >
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onEdit(person);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-text hover:bg-surface-elevated transition-colors"
                >
                  <Edit2 className="w-4 h-4 text-text-dim" />
                  Bearbeiten
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    onDelete(person.id);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 text-sm text-danger hover:bg-danger/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Löschen
                </button>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Person Form (Bottom Sheet)
   ═══════════════════════════════════════════════════════ */
function PersonForm({
  editingMember,
  onClose,
  onSave,
}: {
  editingMember: Person | null;
  onClose: () => void;
  onSave: (d: {
    name: string;
    username: string;
    notes: string;
  }) => Promise<void>;
}) {
  const [name, setName] = useState(editingMember?.name || "");
  const [username, setUsername] = useState(editingMember?.username || "");
  const [notes, setNotes] = useState(editingMember?.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Name erforderlich");
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        username: username.trim(),
        notes: notes.trim(),
      });
    } catch {}
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        className="w-full sm:max-w-md bg-surface rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <button
            onClick={onClose}
            className="text-sm text-text-dim hover:text-text font-medium"
          >
            Abbrechen
          </button>
          <h2 className="text-base font-semibold text-text">
            {editingMember ? "Kontakt bearbeiten" : "Neuer Kontakt"}
          </h2>
          <div className="w-16" />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pt-6 pb-8 space-y-5">
          {/* Avatar preview */}
          {(name || editingMember) && (
            <div className="flex justify-center mb-2">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${getColor(name || editingMember?.name || "?")} flex items-center justify-center shadow-lg border-2 border-border`}
              >
                <span className="text-2xl font-bold text-white">
                  {(name || editingMember?.name || "?")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-2 block">
              Name *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-muted border border-border rounded-2xl px-5 py-4 text-text text-base outline-none focus:border-accent/40 transition-all placeholder:text-text-dim"
              placeholder="Vorname Nachname"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-2 block">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-surface-muted border border-border rounded-2xl px-5 py-4 text-text text-base outline-none focus:border-accent/40 transition-all placeholder:text-text-dim"
              placeholder="@name"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-text-dim uppercase tracking-widest mb-2 block">
              Interne Notizen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-surface-muted border border-border rounded-2xl px-5 py-4 text-text text-base outline-none focus:border-accent/40 transition-all placeholder:text-text-dim min-h-[80px] resize-none"
              placeholder="Optional..."
            />
          </div>

          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="w-full h-14 bg-accent text-white font-bold rounded-2xl hover:opacity-90 transition-all disabled:opacity-20 text-sm uppercase tracking-widest active:scale-[0.98] shadow-lg shadow-accent/20"
          >
            {saving
              ? "Speichert..."
              : editingMember
                ? "Aktualisieren"
                : "Kontakt anlegen"}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════
   Main Members Page
   ═══════════════════════════════════════════════════════ */
export default function Members() {
  const [members, setMembers] = useState<Person[]>([]);
  const [aktionen, setAktionen] = useState<any[]>([]);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);
  const [showModal, setShowModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [selectedAktionId, setSelectedAktionId] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [editTarget, setEditTarget] = useState<Person | null>(null);
  const [formData, setFormData] = useState({ name: "", username: "", notes: "" });
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selected, setSelected] = useState<Person | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [importing, setImporting] = useState(false);

  const handleCsvImport = async () => {
    if (!csvText.trim()) return toast.error("CSV Text fehlt");
    setImporting(true);
    try {
      const res = await fetch("/api/admin/persons/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: csvText })
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Import fehlgeschlagen"); }
      const data = await res.json();
      toast.success(`${data.created} von ${data.total} Mitgliedern importiert`);
      setShowImport(false);
      setCsvText("");
      fetchMembers();
    } catch (e: any) { toast.error(e.message); }
    finally { setImporting(false); }
  };

  useEffect(() => {
    fetchMembers();
    fetchAktionen();
    fetchPendingRequestsCount();
  }, []);

  const fetchPendingRequestsCount = async () => {
    try {
      const res = await fetch("/api/admin/registration-requests");
      if (res.ok) {
        const data = await res.json();
        const pending = Array.isArray(data)
          ? data.filter((r: any) => !r.status || r.status === "pending").length
          : 0;
        setPendingRequestsCount(pending);
      }
    } catch (e) {}
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/admin/persons");
      if (res.ok) setMembers(await res.json());
    } catch (e) { toast.error("Fehler beim Laden"); }
    finally { setLoading(false); }
  };

  const fetchAktionen = async () => {
    try {
      const res = await fetch("/api/admin/events");
      if (res.ok) setAktionen(await res.json());
    } catch (e) { toast.error("Fehler beim Laden der Aktionen"); }
  };

  const handleSave = async (data: { name: string; username: string; notes: string }) => {
    const url = editTarget ? `/api/admin/persons/${editTarget.id}` : "/api/admin/persons";
    const method = editTarget ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Fehler"); }
    toast.success(editTarget ? "Aktualisiert" : "Angelegt");
    setShowModal(false); setEditTarget(null); setSelected(null);
    fetchMembers();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await fetch(`/api/admin/persons/${deleteId}`, { method: "DELETE" });
    toast.success("Gelöscht");
    setDeleteId(null); setSelected(null);
    fetchMembers();
  };

  const handleBulkInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAktionId) return toast.error("Bitte wähle eine Aktion aus");
    setIsInviting(true);
    try {
      const memberIds = members.map((m) => m.id);
      const res = await fetch(`/api/admin/events/${selectedAktionId}/invites/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ person_ids: memberIds }),
      });
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || "Fehler"); }
      const data = await res.json();
      toast.success(`${data.count} Mitglieder erfolgreich eingeladen!`);
      setShowBulkModal(false);
      setSelectedAktionId("");
    } catch (e: any) { toast.error(e.message); }
    finally { setIsInviting(false); }
  };

  const openEdit = (p: Person) => { setEditTarget(p); setShowModal(true); };
  const openNew = () => { setEditTarget(null); setShowModal(true); };

  const filtered = members.filter((m) =>
    m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (m.username && m.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="pb-24 max-w-2xl mx-auto px-0 sm:px-4">
      <MembersSubNav pendingCount={pendingRequestsCount} />

      {/* Sticky Header */}
      <div className="sticky top-0 z-30 -mx-0 sm:-mx-4 px-4 py-3 bg-surface/90 backdrop-blur-xl border-b border-border mb-2">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-text">Mitglieder</h1>
            <p className="text-xs text-text-dim mt-0.5">{members.length} Personen</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90 transition-all"
            >
              <Search className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowBulkModal(true)}
              disabled={members.length === 0}
              className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90 transition-all disabled:opacity-20"
              title="Multi-Invite"
            >
              <CalendarPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="w-10 h-10 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text active:scale-90 transition-all"
              title="CSV Import"
            >
              <Download className="w-4 h-4 rotate-180" />
            </button>
            <button
              onClick={openNew}
              className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-white shadow-lg shadow-accent/20 active:scale-90 transition-all"
              title="Neu anlegen"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="relative pb-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-dim" />
                <input
                  type="text"
                  placeholder="Suchen..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  autoFocus
                  className="w-full bg-surface-muted border border-border rounded-2xl pl-12 pr-10 py-3 text-text text-sm outline-none focus:border-accent/40 transition-all placeholder:text-text-dim"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Contact List */}
      <div className="divide-y divide-border/50">
        {loading ? (
          <div className="px-4 py-20 text-center">
            <div className="w-8 h-8 border-2 border-text-dim/20 border-t-accent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm text-text-dim">Lade Mitglieder...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-surface-muted flex items-center justify-center mx-auto mb-4 border border-border">
              <Users className="w-8 h-8 text-text-dim/50" />
            </div>
            <p className="text-base text-text-dim">
              {searchTerm ? "Keine Treffer" : "Noch keine Mitglieder"}
            </p>
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(""); setShowSearch(false); }}
                className="mt-4 text-sm text-accent hover:text-orange-400 transition-colors"
              >
                Suche zurücksetzen
              </button>
            )}
          </div>
        ) : (
          filtered.map((member, i) => (
            <PersonCard
              key={member.id}
              person={member}
              index={i}
              onTap={setSelected}
              onEdit={openEdit}
              onDelete={(id) => setDeleteId(id)}
            />
          ))
        )}
      </div>

      {/* Person Detail Sheet */}
      <AnimatePresence>
        {selected && (
          <PersonDetail
            person={selected}
            onClose={() => setSelected(null)}
            onEdit={(p) => { setSelected(null); openEdit(p); }}
            onDelete={(id) => { setSelected(null); setDeleteId(id); }}
          />
        )}
      </AnimatePresence>

      {/* Person Form Sheet */}
      <AnimatePresence>
        {showModal && (
          <PersonForm
            editingMember={editTarget}
            onClose={() => { setShowModal(false); setEditTarget(null); }}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Bulk Invite Modal */}
      <AnimatePresence>
        {showBulkModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center"
            onClick={() => setShowBulkModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-md bg-surface rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2 sm:hidden" />
              <div className="px-6 py-6">
                <h2 className="text-xl font-bold text-text mb-2">Alle einladen</h2>
                <p className="text-sm text-text-dim mb-6">
                  Wähle eine Aktion, um alle {members.length} Mitglieder einzuladen.
                </p>
                <form onSubmit={handleBulkInvite} className="space-y-6">
                  <select
                    required
                    value={selectedAktionId}
                    onChange={(e) => setSelectedAktionId(e.target.value)}
                    className="w-full bg-surface-muted border border-border rounded-2xl p-4 text-text outline-none focus:border-accent/40 transition-all"
                  >
                    <option value="">Bitte wählen...</option>
                    {aktionen.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setShowBulkModal(false)}
                      className="flex-1 h-12 border border-border text-text rounded-2xl font-semibold hover:bg-surface-muted transition-all text-xs uppercase tracking-widest active:scale-95">
                      Abbrechen
                    </button>
                    <button type="submit" disabled={isInviting || !selectedAktionId}
                      className="flex-1 h-12 bg-accent text-white rounded-2xl font-bold hover:opacity-90 disabled:opacity-20 transition-all text-xs uppercase tracking-widest active:scale-95">
                      {isInviting ? "Wird verarbeitet..." : "Einladung senden"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-xl flex items-end sm:items-center justify-center"
            onClick={() => setShowImport(false)}>
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full sm:max-w-md bg-surface rounded-t-[2rem] sm:rounded-[2rem] overflow-hidden shadow-2xl border border-border"
              onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 bg-border rounded-full mx-auto mt-3 mb-2 sm:hidden" />
              <div className="px-6 py-4 border-b border-border">
                <h2 className="text-base font-bold text-text">Mitglieder importieren</h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <p className="text-xs text-text-dim">CSV mit Spalten <strong>name</strong>, optional <strong>username</strong>, <strong>email</strong>. Erste Zeile = Kopfzeile.</p>
                <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
                  placeholder="name,username,email\nMax Mustermann,maxm,max@mail.de\n..."
                  className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40 font-mono min-h-[120px] resize-none" />
                <div className="flex gap-3">
                  <button onClick={() => setShowImport(false)} className="flex-1 py-3 bg-surface-elevated border border-border rounded-xl text-sm text-text-dim hover:text-text">Abbrechen</button>
                  <button onClick={handleCsvImport} disabled={importing || !csvText.trim()}
                    className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-20">
                    {importing ? "Importiert..." : "Importieren"}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Mitglied löschen"
        message="Möchtest du dieses Mitglied wirklich löschen? Alle Einladungen werden ebenfalls gelöscht."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
