import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Settings, User, Lock, Check, X, Eye, EyeOff, Camera, Shield,
  Trash2, UserPlus, Bell, BellOff, Sun, Moon, AlertCircle,
  ChevronDown, ChevronUp, LogOut, Link2, Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getAvatarColor, getInitials } from '../lib/avatar';
import { useTheme } from '../lib/theme';

type Toast = { type: 'success' | 'error'; message: string } | null;

interface AdminUser { id: number; username: string; avatar_url?: string | null; }

function SettingCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
      className="bg-surface-elevated border border-border rounded-2xl p-5"
    >
      {children}
    </motion.div>
  );
}

function SectionHeader({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="w-10 h-10 bg-surface-muted rounded-2xl flex items-center justify-center border border-border shrink-0">
        <Icon className="w-5 h-5 text-text-dim" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-text">{title}</h2>
        <p className="text-text-dim text-xs mt-0.5">{desc}</p>
      </div>
    </div>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-all flex-shrink-0 ${on ? 'bg-accent' : 'bg-border'}`}
    >
      <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-7' : 'left-1'}`} />
    </button>
  );
}

function ToggleRow({ label, desc, on, onToggle }: { label: string; desc?: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 px-1">
      <div>
        <p className="text-sm font-medium text-text">{label}</p>
        {desc && <p className="text-xs text-text-dim mt-0.5">{desc}</p>}
      </div>
      <Toggle on={on} onToggle={onToggle} />
    </div>
  );
}

export default function AdminSettings() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<Toast>(null);
  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Profile
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Password
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  // Admins
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [adminSaving, setAdminSaving] = useState(false);

  // Invites
  const [invites, setInvites] = useState<any[]>([]);
  const [showCreateInvite, setShowCreateInvite] = useState(false);
  const [inviteCreating, setInviteCreating] = useState(false);
  const [newInviteMaxUses, setNewInviteMaxUses] = useState(5);

  // Notifications
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jt-admin-notif-prefs') || '{}'); } catch { return {}; }
  });

  const notifEnabled = notifPermission === 'granted' && notifPrefs.enabled !== false;

  const updateNotifPref = (key: string, val: boolean) => {
    const updated = { ...notifPrefs, [key]: val };
    setNotifPrefs(updated);
    localStorage.setItem('jt-admin-notif-prefs', JSON.stringify(updated));
  };

  useEffect(() => {
    fetch('/api/admin/settings').then(r => r.ok ? r.json() : Promise.reject()).then(s => {
      if (s.username) setUsername(s.username);
      if (s.avatar_url) setAvatarUrl(s.avatar_url);
    }).catch(() => {});
    fetch('/api/auth/check').then(r => r.ok ? r.json() : Promise.reject()).then(a => {
      setCurrentUser(a?.user || null);
    }).catch(() => {});
    fetch('/api/admin/admins').then(r => r.ok ? r.json() : Promise.reject()).then(d => {
      setAdmins(Array.isArray(d) ? d : []);
    }).catch(() => {});
    fetch('/api/auth/invites').then(r => r.ok ? r.json() : Promise.reject()).then(d => {
      setInvites(Array.isArray(d) ? d : []);
    }).catch(() => {});

    if ('Notification' in window) setNotifPermission(Notification.permission);
  }, [navigate]);

  const fetchAdmins = () =>
    fetch('/api/admin/admins').then(r => r.json()).then(d => setAdmins(Array.isArray(d) ? d : [])).catch(() => {});

  const fetchInvites = () =>
    fetch('/api/auth/invites').then(r => r.json()).then(d => setInvites(Array.isArray(d) ? d : [])).catch(() => {});

  const createInvite = async () => {
    setInviteCreating(true);
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member', maxUses: newInviteMaxUses }),
      });
      if (!res.ok) throw new Error('Fehler');
      await fetchInvites();
      showToast('success', 'Einladung erstellt');
      setShowCreateInvite(false);
    } catch { showToast('error', 'Fehler beim Erstellen'); }
    finally { setInviteCreating(false); }
  };

  const deleteInvite = async (id: number) => {
    try {
      await fetch('/api/auth/invite/' + id, { method: 'DELETE' });
      await fetchInvites();
    } catch {}
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(link).then(() => showToast('success', 'Link kopiert!')).catch(() => {});
  };

  // Avatar file handling
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { showToast('error', 'Bild zu groß (max. 500 KB)'); return; }
    if (!file.type.startsWith('image/')) { showToast('error', 'Nur Bilddateien erlaubt'); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatarPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar_url: avatarPreview || avatarUrl }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler'); }
      if (avatarPreview) { setAvatarUrl(avatarPreview); setAvatarPreview(null); }
      showToast('success', 'Profil gespeichert');
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const pwReqs = {
    length: pw.next.length >= 8,
    upper: /[A-Z]/.test(pw.next),
    lower: /[a-z]/.test(pw.next),
    number: /[0-9]/.test(pw.next),
    match: pw.next.length > 0 && pw.next === pw.confirm,
  };
  const pwValid = Object.values(pwReqs).every(Boolean);

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwValid || !pw.current) return;
    setPwSaving(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, avatar_url: avatarUrl, currentPassword: pw.current, newPassword: pw.next }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler'); }
      setPw({ current: '', next: '', confirm: '' });
      showToast('success', 'Passwort geändert');
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setPwSaving(false);
    }
  };

  const createAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername || newAdminPassword.length < 8) return;
    setAdminSaving(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler'); }
      showToast('success', 'Admin erstellt');
      setNewAdminUsername(''); setNewAdminPassword(''); setShowAddAdmin(false);
      fetchAdmins();
    } catch (e: any) {
      showToast('error', e.message);
    } finally {
      setAdminSaving(false);
    }
  };

  const deleteAdmin = async (id: number) => {
    if (!confirm('Diesen Admin-Account wirklich löschen?')) return;
    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || 'Fehler'); }
      showToast('success', 'Admin gelöscht');
      fetchAdmins();
    } catch (e: any) {
      showToast('error', e.message);
    }
  };

  const requestNotifications = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      const updated = { ...notifPrefs, enabled: true, responses: true, system: true };
      setNotifPrefs(updated);
      localStorage.setItem('jt-admin-notif-prefs', JSON.stringify(updated));
      showToast('success', 'Benachrichtigungen aktiviert');
    }
  };

  const disableNotifications = () => {
    const updated = { ...notifPrefs, enabled: false };
    setNotifPrefs(updated);
    localStorage.setItem('jt-admin-notif-prefs', JSON.stringify(updated));
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    navigate('/login');
  };

  const activeAvatar = avatarPreview ?? avatarUrl;

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-32">

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-sm font-semibold shadow-2xl flex items-center gap-3 whitespace-nowrap ${
              toast.type === 'success' ? 'bg-success text-surface' : 'bg-danger text-surface'
            }`}
          >
            {toast.type === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-4 pt-2 pb-4"
      >
        <div className="w-12 h-12 bg-surface-elevated border border-border rounded-2xl flex items-center justify-center shrink-0">
          <Settings className="w-6 h-6 text-text-dim" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-text tracking-tighter">Einstellungen</h1>
          <p className="text-text-dim text-sm">Admin-Konto & System</p>
        </div>
      </motion.div>

      {/* Profil */}
      <SettingCard delay={0.05}>
        <SectionHeader icon={User} title="Profil" desc="Dein Admin-Benutzername und Profilbild" />

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

        <form onSubmit={saveProfile} className="space-y-6">
          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div
              className="relative w-20 h-20 rounded-[1.5rem] overflow-hidden cursor-pointer group shrink-0"
              onClick={() => fileRef.current?.click()}
            >
              {activeAvatar ? (
                <img src={activeAvatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center font-bold font-serif text-2xl text-white"
                  style={{ backgroundColor: getAvatarColor(username || 'Admin') }}
                >
                  {getInitials(username || 'Admin')}
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-text">Profilbild</p>
              <p className="text-xs text-text-dim">Max. 500 KB, JPG/PNG/WebP</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs text-accent font-semibold hover:text-accent/80 transition-colors flex items-center gap-1 mt-1"
              >
                <Camera className="w-3 h-3" /> Foto ändern
              </button>
            </div>
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-semibold text-text mb-2">Benutzername</label>
            <input
              required
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-surface-muted border border-border rounded-2xl px-5 py-3.5 text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-dim"
            />
          </div>

          <button
            type="submit"
            disabled={profileSaving}
            className="w-full py-3.5 bg-accent text-surface rounded-2xl font-semibold text-sm transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {profileSaving ? <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
            Speichern
          </button>
        </form>
      </SettingCard>

      {/* Passwort */}
      <SettingCard delay={0.08}>
        <SectionHeader icon={Lock} title="Passwort ändern" desc="Mindestens 8 Zeichen" />
        <form onSubmit={savePassword} className="space-y-5">
          {[
            { label: 'Aktuelles Passwort', field: 'current' as const, show: showCurrent, setShow: setShowCurrent },
            { label: 'Neues Passwort', field: 'next' as const, show: showNext, setShow: setShowNext },
            { label: 'Passwort bestätigen', field: 'confirm' as const, show: showConfirm, setShow: setShowConfirm },
          ].map(({ label, field, show, setShow }) => (
            <div key={field}>
              <label className="block text-sm font-semibold text-text mb-2">{label}</label>
              <div className="relative">
                <input
                  type={show ? 'text' : 'password'}
                  value={pw[field]}
                  onChange={e => setPw(p => ({ ...p, [field]: e.target.value }))}
                  className="w-full bg-surface-muted border border-border rounded-2xl px-5 py-3.5 pr-12 text-text text-sm focus:outline-none focus:border-accent/50 focus:ring-2 focus:ring-accent/10 transition-all placeholder:text-text-dim"
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShow(v => !v)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-dim hover:text-text transition-colors">
                  {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ))}

          {pw.next.length > 0 && (
            <div className="grid grid-cols-2 gap-1.5 p-4 bg-surface-muted rounded-2xl border border-border">
              {[
                { met: pwReqs.length, text: 'Mind. 8 Zeichen' },
                { met: pwReqs.upper, text: 'Großbuchstabe' },
                { met: pwReqs.lower, text: 'Kleinbuchstabe' },
                { met: pwReqs.number, text: 'Zahl' },
                { met: pwReqs.match, text: 'Passwörter gleich' },
              ].map(({ met, text }) => (
                <div key={text} className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-success' : 'text-text-dim'}`}>
                  {met ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 opacity-40" />}
                  <span>{text}</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            disabled={pwSaving || !pwValid || !pw.current}
            className="w-full py-3.5 bg-accent text-surface rounded-2xl font-semibold text-sm transition-all hover:bg-accent/90 active:scale-[0.98] disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {pwSaving ? <span className="w-4 h-4 border-2 border-surface/30 border-t-surface rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
            Passwort ändern
          </button>
        </form>
      </SettingCard>

      {/* Benachrichtigungen */}
      <SettingCard delay={0.11}>
        <SectionHeader icon={Bell} title="Benachrichtigungen" desc="Browser-Push-Meldungen für wichtige Ereignisse" />

        {'Notification' in window ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-surface-muted rounded-2xl border border-border">
              <div className="flex items-center gap-3">
                {notifEnabled ? <Bell className="w-4 h-4 text-accent" /> : <BellOff className="w-4 h-4 text-text-dim" />}
                <div>
                  <p className="text-sm font-semibold text-text">Push-Benachrichtigungen</p>
                  {notifPermission === 'denied' && (
                    <p className="text-xs text-danger mt-0.5">Im Browser gesperrt — Browsereinstellungen öffnen</p>
                  )}
                </div>
              </div>
              {notifPermission !== 'denied' && (
                <Toggle on={notifEnabled} onToggle={notifEnabled ? disableNotifications : requestNotifications} />
              )}
            </div>

            <AnimatePresence>
              {notifEnabled && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pl-2 divide-y divide-border"
                >
                  {[
                    { key: 'responses', label: 'Neue Rückmeldungen', desc: 'Wenn Mitglieder zu- oder absagen' },
                    { key: 'registrations', label: 'Registrierungsanfragen', desc: 'Neue Beitrittsanfragen' },
                    { key: 'system', label: 'Systemhinweise', desc: 'Wichtige Admin-Informationen' },
                  ].map(({ key, label, desc }) => (
                    <ToggleRow
                      key={key}
                      label={label}
                      desc={desc}
                      on={notifPrefs[key] !== false}
                      onToggle={() => updateNotifPref(key, notifPrefs[key] !== false ? false : true)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <p className="text-sm text-text-dim">Dein Browser unterstützt keine Push-Benachrichtigungen.</p>
        )}
      </SettingCard>

      {/* Darstellung */}
      <SettingCard delay={0.14}>
        <SectionHeader icon={theme === 'dark' ? Moon : Sun} title="Darstellung" desc="Erscheinungsbild der Oberfläche" />
        <div className="flex items-center justify-between p-4 bg-surface-muted rounded-2xl border border-border">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon className="w-4 h-4 text-text-dim" /> : <Sun className="w-4 h-4 text-accent" />}
            <div>
              <p className="text-sm font-semibold text-text">{theme === 'dark' ? 'Dunkelmodus' : 'Hellmodus'}</p>
              <p className="text-xs text-text-dim mt-0.5">Aktuell aktives Farbschema</p>
            </div>
          </div>
          <Toggle on={theme === 'dark'} onToggle={toggleTheme} />
        </div>
      </SettingCard>

      {/* Admins verwalten */}
      <SettingCard delay={0.17}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-muted rounded-2xl flex items-center justify-center border border-border shrink-0">
              <Shield className="w-5 h-5 text-text-dim" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Admins verwalten</h2>
              <p className="text-text-dim text-xs mt-0.5">Weitere Admin-Accounts für das Team</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowAddAdmin(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-surface-muted border border-border rounded-2xl text-xs font-semibold text-text-dim hover:text-text hover:bg-surface-elevated transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Hinzufügen
            {showAddAdmin ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <AnimatePresence>
          {showAddAdmin && (
            <motion.form
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
              onSubmit={createAdmin}
            >
              <div className="mb-6 p-6 bg-surface-muted border border-border rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-dim uppercase tracking-widest mb-2">Benutzername</label>
                  <input
                    type="text"
                    value={newAdminUsername}
                    onChange={e => setNewAdminUsername(e.target.value)}
                    placeholder="z.B. tom_orga"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-accent/50 transition-all placeholder:text-text-dim"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-dim uppercase tracking-widest mb-2">Initial-Passwort</label>
                  <input
                    type="password"
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    placeholder="Mind. 8 Zeichen"
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-accent/50 transition-all placeholder:text-text-dim"
                  />
                </div>
                <button
                  type="submit"
                  disabled={adminSaving || !newAdminUsername || newAdminPassword.length < 8}
                  className="w-full py-3 bg-accent text-surface rounded-xl text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {adminSaving ? <span className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Admin erstellen
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {admins.map(admin => (
            <div
              key={admin.id}
              className="flex items-center justify-between p-4 bg-surface-muted border border-border rounded-2xl hover:bg-surface-elevated transition-all"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold font-serif text-sm text-white shrink-0"
                  style={{ backgroundColor: getAvatarColor(admin.username) }}
                >
                  {getInitials(admin.username)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text">@{admin.username}</p>
                  {currentUser && admin.id === currentUser.id && (
                    <p className="text-xs text-text-dim mt-0.5">Du</p>
                  )}
                </div>
              </div>
              {currentUser && admin.id !== currentUser.id && (
                <button
                  type="button"
                  onClick={() => deleteAdmin(admin.id)}
                  className="p-2.5 text-text-dim hover:text-danger hover:bg-danger/10 rounded-xl transition-all"
                  title="Admin löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {admins.length === 0 && (
            <p className="text-sm text-text-dim text-center py-4">Keine weiteren Admins</p>
          )}
        </div>
      </SettingCard>

      {/* Einladungen */}
      <SettingCard delay={0.19}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-surface-muted rounded-2xl flex items-center justify-center border border-border shrink-0">
              <Link2 className="w-5 h-5 text-text-dim" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-text">Einladungs-Links</h2>
              <p className="text-text-dim text-xs mt-0.5">Codes für neue Mitglieder erstellen</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateInvite(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-accent text-surface rounded-2xl text-xs font-semibold hover:opacity-90 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            Neu
            {showCreateInvite ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        <AnimatePresence>
          {showCreateInvite && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mb-6 p-6 bg-surface-muted border border-border rounded-2xl space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-text-dim uppercase tracking-widest mb-2">Max. Verwendungen</label>
                  <select
                    value={newInviteMaxUses}
                    onChange={e => setNewInviteMaxUses(Number(e.target.value))}
                    className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-sm text-text focus:outline-none focus:border-accent/50 transition-all"
                  >
                    {[1, 3, 5, 10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <button
                  onClick={createInvite}
                  disabled={inviteCreating}
                  className="w-full py-3 bg-accent text-surface rounded-xl text-sm font-semibold hover:bg-accent/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  {inviteCreating ? <span className="w-3.5 h-3.5 border-2 border-surface/30 border-t-surface rounded-full animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                  Einladung generieren
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3">
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center justify-between p-4 bg-surface-muted border border-border rounded-2xl hover:bg-surface-elevated transition-all">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <code className="text-sm font-mono font-bold text-accent tracking-wider">{inv.code}</code>
                  <button onClick={() => copyLink(inv.code)} className="p-1 text-text-dim hover:text-accent transition-colors">
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-text-dim">
                  {inv.used_count}/{inv.max_uses} verwendet
                  {inv.expires_at && ` · läuft ab ${new Date(inv.expires_at).toLocaleDateString('de-DE')}`}
                </p>
              </div>
              <button onClick={() => deleteInvite(inv.id)} className="p-2 text-text-dim hover:text-danger hover:bg-danger/10 rounded-xl transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {invites.length === 0 && <p className="text-sm text-text-dim text-center py-4">Keine Einladungen</p>}
        </div>
      </SettingCard>

      {/* Abmelden */}
      <SettingCard delay={0.20}>
        <SectionHeader icon={LogOut} title="Sitzung" desc="Aktuell angemeldetes Admin-Konto" />
        {currentUser && (
          <div className="flex items-center justify-between py-3 mb-6">
            <span className="text-sm text-text-dim">Angemeldet als</span>
            <span className="text-sm font-semibold text-text">@{currentUser.username}</span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full py-3.5 bg-surface-muted border border-border hover:border-danger/30 hover:bg-danger/5 text-danger rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Abmelden
        </button>
      </SettingCard>

    </div>
  );
}
