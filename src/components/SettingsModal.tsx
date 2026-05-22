import React, { useState, useEffect, useRef } from 'react';
import { X, Eye, EyeOff, Settings, UserPlus, Trash2, Shield, Camera, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { getAvatarColor, getInitials, processAvatarFile } from '../lib/avatar';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface AdminUser {
  id: number;
  username: string;
  avatar_url?: string | null;
}

export default function SettingsModal({ isOpen, onClose }: Props) {
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Admin Management state
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [newAdminUsername, setNewAdminUsername] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admin/admins');
      if (res.ok) {
        const data = await res.json();
        setAdmins(data);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      fetch('/api/admin/settings')
        .then(res => res.json())
        .then(data => {
          if (data.username) setUsername(data.username);
          if (data.avatar_url) setAvatarUrl(data.avatar_url);
        })
        .catch(() => toast.error('Fehler beim Laden der Einstellungen'));

      fetch('/api/auth/check')
        .then(res => res.json())
        .then(data => setCurrentUser(data.user))
        .catch(() => {});

      fetchAdmins();

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowAddAdmin(false);
    }
  }, [isOpen]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 500 * 1024) {
      toast.error('Bild ist zu groß (max. 500KB)');
      return;
    }

    if (!file.type.match('image.*')) {
      toast.error('Bitte nur Bilddateien auswählen');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const triggerAvatarUpload = () => {
    fileInputRef.current?.click();
  };

  if (!isOpen) return null;

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUsername || !newAdminPassword) return;
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fehler beim Erstellen');
      }

      toast.success('Neuer Admin erfolgreich erstellt');
      setNewAdminUsername('');
      setNewAdminPassword('');
      setShowAddAdmin(false);
      fetchAdmins();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (!confirm('Bist du sicher, dass du diesen Admin-Zugang löschen möchtest?')) return;

    try {
      const res = await fetch(`/api/admin/admins/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fehler beim Löschen');
      }
      toast.success('Admin erfolgreich gelöscht');
      fetchAdmins();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword && !currentPassword) {
      toast.error('Bitte gib dein aktuelles Passwort ein, um ein neues zu setzen');
      return;
    }

    if (currentPassword && !newPassword) {
      toast.error('Bitte gib ein neues Passwort ein');
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Die neuen Passwörter stimmen nicht überein');
      return;
    }

    if (newPassword && newPassword.length < 8) {
      toast.error('Das neue Passwort muss mindestens 8 Zeichen lang sein');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          avatar_url: avatarPreview || avatarUrl,
          currentPassword,
          newPassword
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Fehler beim Speichern');
      }

      toast.success('Einstellungen erfolgreich gespeichert');
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-6 backdrop-blur-2xl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#050505] border border-white/10 rounded-[2rem] sm:rounded-[3rem] shadow-2xl max-w-md w-full p-6 sm:p-12 relative overflow-y-auto max-h-[90vh] overflow-hidden"
      >
        <button 
          onClick={onClose} 
          className="absolute top-6 right-6 sm:top-8 sm:right-8 text-white/20 hover:text-white transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="flex items-center gap-6 mb-10 relative z-10">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <Settings className="w-7 h-7 text-white/40" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-white tracking-tight">Einstellungen</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
          {/* Avatar Section */}
          <div className="flex flex-col items-center py-6 pb-8">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleAvatarChange}
              accept="image/*"
              className="hidden"
            />
            <div
              onClick={triggerAvatarUpload}
              className="relative cursor-pointer group"
            >
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-3xl font-bold text-white shadow-2xl ring-4 ring-white/10 transition-all group-hover:ring-white/20 overflow-hidden"
                style={{
                  backgroundColor: avatarPreview || avatarUrl
                    ? 'transparent'
                    : getAvatarColor(username || 'User')
                }}
              >
                {avatarPreview || avatarUrl ? (
                  <img
                    src={avatarPreview || avatarUrl || ''}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{getInitials(username || 'User')}</span>
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
            </div>
            <p className="text-xs text-white/40 mt-4">Klick um Avatar zu ändern</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Benutzername</label>
            <input
              required
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all"
            />
          </div>

          <div className="pt-8 border-t border-white/5">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-6">Passwort ändern</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Aktuelles Passwort</label>
                <div className="relative">
                  <input 
                    type={showCurrent ? "text" : "password"} 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-14 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all" 
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                    {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Neues Passwort</label>
                <div className="relative">
                  <input 
                    type={showNew ? "text" : "password"} 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-14 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all" 
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                    {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-white/20 uppercase tracking-widest ml-1">Bestätigen</label>
                <div className="relative">
                  <input 
                    type={showConfirm ? "text" : "password"} 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 pr-14 text-white focus:ring-2 focus:ring-white/10 outline-none transition-all" 
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-5 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-colors">
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-8 border-t border-white/5">
            <button 
              type="button" 
              onClick={onClose} 
              disabled={loading}
              className="flex-1 px-6 py-4 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/5 transition-all disabled:opacity-20"
            >
              Abbrechen
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="flex-1 px-6 py-4 bg-white text-black rounded-2xl font-bold hover:bg-white/90 transition-all disabled:opacity-20 flex items-center justify-center"
            >
              {loading ? '...' : 'Speichern'}
            </button>
          </div>

          <div className="pt-12 mt-12 border-t border-white/10">
            <div className="flex items-center justify-between mb-8">
              <div className="space-y-1">
                <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">Admins verwalten</h3>
                <p className="text-[11px] text-white/20">Zusätzliche Admin-Accounts für das Team</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddAdmin(!showAddAdmin)}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>

            {showAddAdmin && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">Neuer Benutzername</label>
                  <input 
                    type="text" 
                    value={newAdminUsername}
                    onChange={e => setNewAdminUsername(e.target.value)}
                    placeholder="z.B. tom_orga"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-white/20 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-white/20 uppercase tracking-widest ml-1">Initial-Passwort</label>
                  <input 
                    type="password" 
                    value={newAdminPassword}
                    onChange={e => setNewAdminPassword(e.target.value)}
                    placeholder="Mind. 8 Zeichen"
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white focus:ring-1 focus:ring-white/20 outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleCreateAdmin}
                  disabled={loading || !newAdminUsername || newAdminPassword.length < 8}
                  className="w-full py-3 bg-white/10 text-white rounded-xl text-sm font-bold hover:bg-white/20 transition-all disabled:opacity-20"
                >
                  Admin erstellen
                </button>
              </motion.div>
            )}

            <div className="space-y-3">
              {admins.map(admin => (
                <div 
                  key={admin.id} 
                  className="flex items-center justify-between p-5 bg-white/[0.02] border border-white/5 rounded-2xl group hover:bg-white/[0.04] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                      <Shield className="w-4 h-4 text-white/20" />
                    </div>
                    <span className="text-sm text-white/60 font-medium">@{admin.username}</span>
                  </div>
                  
                  {currentUser && admin.id !== currentUser.id && (
                    <button
                      type="button"
                      onClick={() => handleDeleteAdmin(admin.id)}
                      className="p-3 text-white/10 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {currentUser && admin.id === currentUser.id && (
                    <span className="text-[9px] font-bold text-white/10 uppercase tracking-widest mr-2">Ich</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
