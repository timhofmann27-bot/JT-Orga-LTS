import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, Check, X, Eye, EyeOff, LogOut, AlertCircle, Shield, Pencil, Camera, Trash2, Bell, BellOff, ShieldCheck } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface Profile {
  name: string;
  username: string;
  avatar_url: string | null;
  created_at: string | null;
}

type Toast = { type: 'success' | 'error'; message: string } | null;

function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className={`flex items-center gap-2 text-xs transition-colors ${met ? 'text-success' : 'text-text-dim'}`}>
      {met ? <Check className="w-3.5 h-3.5 shrink-0" /> : <X className="w-3.5 h-3.5 shrink-0 opacity-40" />}
      <span>{text}</span>
    </div>
  );
}

function AvatarDisplay({
  name,
  avatarUrl,
  size = 'lg',
  onClick,
  pending,
}: {
  name: string;
  avatarUrl?: string | null;
  size?: 'sm' | 'lg';
  onClick?: () => void;
  pending?: boolean;
}) {
  const initials = (name || '?').split(' ').filter(Boolean).map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const dim = size === 'lg' ? 'w-20 h-20' : 'w-10 h-10';
  const textSize = size === 'lg' ? 'text-2xl' : 'text-sm';
  const radius = size === 'lg' ? 'rounded-[2rem]' : 'rounded-2xl';

  return (
    <div
      className={`relative ${dim} ${radius} shrink-0 ${onClick ? 'cursor-pointer group' : ''}`}
      onClick={onClick}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name}
          className={`${dim} ${radius} object-cover`}
        />
      ) : (
        <div className={`${dim} ${radius} bg-accent text-surface flex items-center justify-center font-bold font-serif ${textSize}`}>
          {initials}
        </div>
      )}
      {onClick && size === 'lg' && (
        <div className={`absolute inset-0 ${radius} bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
          {pending ? (
            <span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Camera className="w-6 h-6 text-white" />
          )}
        </div>
      )}
    </div>
  );
}

async function resizeImageToDataUrl(file: File, maxPx = 320): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      const size = Math.min(img.width, img.height, maxPx);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not available')); return; }
      const ox = (img.width - size) / 2;
      const oy = (img.height - size) / 2;
      ctx.drawImage(img, ox, oy, size, size, 0, 0, size, size);
      URL.revokeObjectURL(blobUrl);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Bild konnte nicht geladen werden')); };
    img.src = blobUrl;
  });
}

export default function MemberProfile() {
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);

  const [nameForm, setNameForm] = useState({ name: '', username: '' });
  const [nameSaving, setNameSaving] = useState(false);

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);

  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [notifPrefs, setNotifPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jt-notif-prefs') || '{}'); } catch { return {}; }
  });

  const [privacyPrefs, setPrivacyPrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('jt-privacy-prefs') || '{}'); } catch { return {}; }
  });

  const pw = pwForm.next;
  const pwReqs = {
    length: pw.length >= 12,
    upper: /[A-Z]/.test(pw),
    lower: /[a-z]/.test(pw),
    number: /[0-9]/.test(pw),
    special: /[^A-Za-z0-9]/.test(pw),
    match: pw.length > 0 && pw === pwForm.confirm,
  };
  const pwValid = Object.values(pwReqs).every(Boolean);

  useEffect(() => {
    fetch('/api/public/profile')
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then((data: Profile) => {
        setProfile(data);
        setNameForm({ name: data.name || '', username: data.username || '' });
        setLoading(false);
      })
      .catch(() => navigate('/login'));

    if ('Notification' in window) {
      setNotifPermission(Notification.permission);
    }
  }, [navigate]);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const putProfile = async (payload: Record<string, unknown>) => {
    const res = await fetch('/api/public/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Fehler');
    return data;
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameSaving(true);
    try {
      await putProfile({ name: nameForm.name, username: nameForm.username, avatar_url: profile?.avatar_url });
      setProfile(prev => prev ? { ...prev, name: nameForm.name, username: nameForm.username } : prev);
      showToast('success', 'Profil gespeichert');
    } catch (e: any) {
      showToast('error', e.message || 'Fehler beim Speichern');
    } finally {
      setNameSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      showToast('error', 'Datei ist zu groß (max. 8 MB)');
      return;
    }
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Bitte wähle eine Bilddatei aus');
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, 320);
      setAvatarPreview(dataUrl);
    } catch {
      showToast('error', 'Bild konnte nicht verarbeitet werden');
    }
    e.target.value = '';
  };

  const saveAvatar = async (url: string | null) => {
    if (!profile) return;
    setAvatarSaving(true);
    try {
      await putProfile({ name: profile.name, username: profile.username, avatar_url: url });
      setProfile(prev => prev ? { ...prev, avatar_url: url } : prev);
      setAvatarPreview(null);
      showToast('success', url ? 'Profilbild gespeichert' : 'Profilbild entfernt');
    } catch (e: any) {
      showToast('error', e.message || 'Fehler beim Speichern');
    } finally {
      setAvatarSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwValid) return;
    setPwSaving(true);
    try {
      await putProfile({
        name: profile?.name,
        username: profile?.username,
        avatar_url: profile?.avatar_url,
        currentPassword: pwForm.current,
        newPassword: pwForm.next,
        confirmPassword: pwForm.confirm,
      });
      setPwForm({ current: '', next: '', confirm: '' });
      showToast('success', 'Passwort geändert — du wirst abgemeldet');
      setTimeout(() => {
        fetch('/api/public/logout', { method: 'POST' }).finally(() => navigate('/login'));
      }, 2000);
    } catch (e: any) {
      showToast('error', e.message || 'Fehler beim Ändern des Passworts');
    } finally {
      setPwSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
    await fetch('/api/public/logout', { method: 'POST' }).catch(() => {});
    navigate('/login');
  };


  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    const perm = await Notification.requestPermission();
    setNotifPermission(perm);
    if (perm === 'granted') {
      const updated = { ...notifPrefs, enabled: true, invites: true, reminders: true };
      setNotifPrefs(updated);
      localStorage.setItem('jt-notif-prefs', JSON.stringify(updated));
      showToast('success', 'Benachrichtigungen aktiviert');
    }
  };

  const disableNotifications = () => {
    const updated = { ...notifPrefs, enabled: false };
    setNotifPrefs(updated);
    localStorage.setItem('jt-notif-prefs', JSON.stringify(updated));
  };

  const updateNotifPref = (key: string, value: boolean) => {
    const updated = { ...notifPrefs, [key]: value };
    setNotifPrefs(updated);
    localStorage.setItem('jt-notif-prefs', JSON.stringify(updated));
  };

  const updatePrivacyPref = (key: string, value: boolean) => {
    const updated = { ...privacyPrefs, [key]: value };
    setPrivacyPrefs(updated);
    localStorage.setItem('jt-privacy-prefs', JSON.stringify(updated));
  };

  const notifEnabled = notifPermission === 'granted' && notifPrefs.enabled !== false;

  if (loading) {
    return <div className="min-h-screen bg-surface flex items-center justify-center"><span className="w-5 h-5 border-2 border-text-dim/20 border-t-accent rounded-full animate-spin" /></div>;
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-muted border border-border rounded-2xl p-6 text-center max-w-sm w-full">
          <User className="w-10 h-10 text-text-dim mx-auto mb-3" />
          <h2 className="text-lg font-bold text-text mb-1">Nicht eingeloggt</h2>
          <p className="text-sm text-text-dim mb-4">Bitte melde dich an.</p>
          <Link to="/login" className="inline-block px-6 py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90">
            Zum Login
          </Link>
        </div>
      </div>
    );
  }

  const currPw = formData.currentPassword;

  return (
    <div className="min-h-screen bg-surface pb-28">
      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-text">Profil</h1>
            <p className="text-xs text-text-dim mt-0.5">@{profile.username}</p>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-surface-elevated border border-border rounded-xl text-xs font-semibold text-text-dim hover:text-danger hover:border-danger/30 transition-all active:scale-95">
            <LogOut className="w-3.5 h-3.5" /> Abmelden
          </button>
        </div>

        {/* Avatar + Name */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5">
          <div className="flex items-center gap-4">
            <AvatarDisplay name={profile.name} avatarUrl={profile.avatar_url} size="lg" onClick={() => fileRef.current?.click()} />
            <div>
              <h2 className="text-lg font-bold text-text">{profile.name}</h2>
              <p className="text-sm text-text-dim">@{profile.username}</p>
              {profile.created_at && <p className="text-xs text-text-dim/50 mt-1">Mitglied seit {format(parseISO(profile.created_at), 'MMMM yyyy', { locale: de })}</p>}
            </div>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
        </div>

        {/* Form */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-text">Einstellungen</h3>

          <div>
            <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Anzeigename</label>
            <input value={formData.displayName} onChange={e => setFormData(f => ({ ...f, displayName: e.target.value }))}
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" />
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Benutzername</label>
            <input value={formData.username} onChange={e => setFormData(f => ({ ...f, username: e.target.value }))}
              className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" />
          </div>

          <div className="pt-2">
            <button onClick={() => setShowPasswordForm(true)}
              className="w-full py-3 bg-surface-elevated border border-border rounded-xl text-sm font-semibold text-text-dim hover:text-text hover:border-accent/30 transition-all active:scale-[0.98]">
              Passwort ändern
            </button>
          </div>
        </div>

        {/* Password Form */}
        <AnimatePresence>
          {showPasswordForm && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="bg-surface-muted border border-border rounded-2xl p-5 space-y-4">
              <h3 className="text-sm font-bold text-text">Passwort</h3>
              <div>
                <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Aktuelles Passwort</label>
                <div className="relative">
                  <input type={showPw.current ? 'text' : 'password'} value={passwordForm.currentPassword} onChange={e => setPasswordForm(f => ({ ...f, currentPassword: e.target.value }))}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 pr-10 text-sm text-text outline-none focus:border-accent/40" />
                  <button type="button" onClick={() => setShowPw(f => ({ ...f, current: !f.current }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text">
                    {showPw.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Neues Passwort</label>
                <div className="relative">
                  <input type={showPw.newPw ? 'text' : 'password'} value={passwordForm.newPassword} onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 pr-10 text-sm text-text outline-none focus:border-accent/40" />
                  <button type="button" onClick={() => setShowPw(f => ({ ...f, newPw: !f.newPw }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text">
                    {showPw.newPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5 block">Wiederholen</label>
                <input type="password" value={passwordForm.confirmPassword} onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text outline-none focus:border-accent/40" />
              </div>

              {passwordForm.newPassword && (
                <div className="space-y-1">
                  <PasswordRequirement met={passwordForm.newPassword.length >= 8} text="Mindestens 8 Zeichen" />
                  <PasswordRequirement met={/[A-Z]/.test(passwordForm.newPassword)} text="Großbuchstabe" />
                  <PasswordRequirement met={/[0-9]/.test(passwordForm.newPassword)} text="Zahl" />
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={handlePasswordChange} disabled={changingPassword}
                  className="flex-1 py-3 bg-accent text-white rounded-xl text-sm font-bold hover:opacity-90 disabled:opacity-20">
                  {changingPassword ? 'Speichert...' : 'Passwort ändern'}
                </button>
                <button onClick={() => setShowPasswordForm(false)}
                  className="px-4 py-3 bg-surface-elevated border border-border rounded-xl text-sm text-text-dim hover:text-text">
                  Abbrechen
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notifications section */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5 space-y-4">
          <h3 className="text-sm font-bold text-text">Benachrichtigungen</h3>
          {pushEnabled !== null && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-text-dim">
                {pushEnabled ? <Bell className="w-4 h-4 text-accent" /> : <BellOff className="w-4 h-4" />}
                <span>Push-Benachrichtigungen {pushEnabled ? 'aktiv' : 'inaktiv'}</span>
              </div>
              {pushEnabled ? (
                <button onClick={handleDisablePush}
                  className="px-3 py-1.5 bg-surface-elevated border border-border rounded-lg text-xs font-semibold text-text-dim hover:text-danger transition-colors">
                  Deaktivieren
                </button>
              ) : (
                <button onClick={handleEnablePush}
                  className="px-3 py-1.5 bg-accent text-white rounded-lg text-xs font-semibold hover:opacity-90">
                  Aktivieren
                </button>
              )}
            </div>
          )}
        </div>

        {/* Delete account */}
        <div className="bg-surface-muted border border-danger/20 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-text">Konto löschen</h3>
              <p className="text-xs text-text-dim mt-0.5">Alle Daten werden unwiderruflich gelöscht</p>
            </div>
            <button onClick={() => setConfirmDelete(true)}
              className="px-4 py-2 bg-danger/10 border border-danger/20 rounded-xl text-xs font-bold text-danger hover:bg-danger/20 transition-all active:scale-95">
              Löschen
            </button>
          </div>
        </div>

        <ConfirmModal isOpen={confirmDelete} title="Konto löschen"
          message="Bist du sicher? Alle Daten werden gelöscht."
          onConfirm={handleDeleteAccount} onCancel={() => setConfirmDelete(false)} />
      </div>
    </div>
  );
}
