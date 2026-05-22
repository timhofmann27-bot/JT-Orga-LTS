import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { CheckCircle, ArrowRight, User, Lock } from 'lucide-react';

interface InviteProfileProps {
  invitee: any;
  currentUser: any;
  setupUsername: string;
  setSetupUsername: (s: string) => void;
  setupPassword: string;
  setSetupPassword: (s: string) => void;
  isSettingUp: boolean;
  handleSetupProfile: (e: React.FormEvent) => void;
  loginPassword: string;
  setLoginPassword: (s: string) => void;
  isLoggingIn: boolean;
  handleLogin: (e: React.FormEvent) => void;
}

export default function InviteProfile({
  invitee,
  currentUser,
  setupUsername,
  setSetupUsername,
  setupPassword,
  setSetupPassword,
  isSettingUp,
  handleSetupProfile,
  loginPassword,
  setLoginPassword,
  isLoggingIn,
  handleLogin
}: InviteProfileProps) {
  return (
    <div>
      {!invitee.has_profile ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="premium-card rounded-4xl p-10 sm:p-20 relative overflow-hidden shadow-none border-white/[0.08]"
        >
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
               <span className="micro-label uppercase tracking-[0.3em]">Identitäts-Protokoll</span>
            </div>
            <h2 className="text-5xl sm:text-7xl font-serif font-black text-white mb-8 tracking-tighter leading-none">Profil <span className="text-white/30 italic">Wählen</span></h2>
            <p className="text-white/30 mb-16 font-medium leading-[1.3] text-xl tracking-tight max-w-sm italic">
              Erstelle ein Profil, um deine Signale zu festigen und operative Updates zu erhalten.
            </p>
            
            <form onSubmit={handleSetupProfile} className="space-y-10">
              <div className="grid sm:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <span className="micro-label !text-white/10 pl-1">Name</span>
                  <div className="relative group">
                    <User className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-white transition-all" />
                    <input 
                      type="text" 
                      required 
                      value={setupUsername}
                      onChange={e => setSetupUsername(e.target.value)}
                      placeholder="z.B. agent.null"
                      className="w-full bg-black/40 border border-white/5 rounded-3xl p-8 pl-16 text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all text-lg font-serif italic"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <span className="micro-label !text-white/10 pl-1">Passwort</span>
                  <div className="relative group">
                    <Lock className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-white transition-all" />
                    <input 
                      type="password" 
                      required 
                      minLength={8}
                      value={setupPassword}
                      onChange={e => setSetupPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-black/40 border border-white/5 rounded-3xl p-8 pl-16 text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all text-lg font-serif italic"
                    />
                  </div>
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSettingUp}
                className="w-full bg-white text-black font-black py-8 rounded-[2rem] hover:bg-white/90 transition-all text-[11px] uppercase tracking-[0.4em] disabled:opacity-50 shadow-[0_24px_48px_rgba(255,255,255,0.1)] active:scale-95"
              >
                {isSettingUp ? 'Initialisiere...' : 'Profil Erstellen'}
              </motion.button>
            </form>
          </div>
        </motion.div>
      ) : currentUser?.id === invitee.person_id ? (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          className="premium-card rounded-4xl p-12 flex flex-col sm:flex-row items-center justify-between gap-12 border-white/[0.08] shadow-none py-16"
        >
          <div className="flex items-center gap-10">
            <div className="w-24 h-24 bg-white text-black rounded-3xl flex items-center justify-center shadow-[0_20px_40px_rgba(255,255,255,0.1)]">
              <CheckCircle className="w-12 h-12" />
            </div>
            <div className="text-left space-y-2">
              <div className="font-serif text-4xl font-black text-white tracking-tighter leading-none">Identität Bestätigt</div>
              <div className="text-white/20 font-medium text-lg leading-tight tracking-tight italic">Einsatzprotokoll {currentUser.username} läuft.</div>
            </div>
          </div>
          <Link 
            to="/dashboard"
            className="w-full sm:w-auto text-black font-black text-[11px] bg-white hover:bg-white/90 px-16 py-8 rounded-[2rem] transition-all flex items-center justify-center gap-4 uppercase tracking-[0.4em] shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
          >
            Zum Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      ) : (
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="premium-card rounded-4xl p-10 sm:p-20 relative overflow-hidden shadow-none border-white/[0.08]"
        >
          <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-white/[0.03] to-transparent pointer-events-none" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
               <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]" />
               <span className="micro-label !text-amber-400/60 uppercase tracking-[0.3em]">Login erforderlich</span>
            </div>
            <h2 className="text-5xl sm:text-7xl font-serif font-black text-white mb-8 tracking-tighter leading-none">
              {invitee.is_admin_account ? 'Einsatzleitung' : 'Rückruf'} <span className="text-white/30 italic">{invitee.is_admin_account ? 'Bestätigen' : 'Notwendig'}</span>
            </h2>
            <p className="text-white/30 mb-16 font-medium leading-[1.3] text-xl tracking-tight max-w-sm italic">
              {invitee.is_admin_account 
                ? `Melde dich mit deinem Administrator-Konto (@${invitee.username || invitee.suggested_username}) an, um Zugriff zu erhalten.` 
                : `Du hast bereits ein Profil für ${invitee.username || 'deinen Account'} erstellt. Melde dich an, um fortzufahren.`}
            </p>
            
            <form onSubmit={handleLogin} className="space-y-10">
              <div className="space-y-4">
                <span className="micro-label !text-white/10 pl-1">Passwort</span>
                <div className="relative group">
                  <Lock className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-white/10 group-focus-within:text-white transition-all" />
                  <input 
                    type="password" 
                    required 
                    value={loginPassword}
                    onChange={e => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/5 rounded-3xl p-8 pl-16 text-white placeholder:text-white/10 focus:outline-none focus:border-white/20 transition-all text-lg font-serif italic"
                  />
                </div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-white text-black font-black py-8 rounded-[2rem] hover:bg-white/90 transition-all text-[11px] uppercase tracking-[0.4em] disabled:opacity-50 shadow-[0_24px_48px_rgba(255,255,255,0.1)] active:scale-95"
              >
                {isLoggingIn ? 'Verifiziere...' : 'Einloggen'}
              </motion.button>
              <div className="text-center">
                <Link to="/login" className="text-[9px] font-black uppercase tracking-[0.2em] text-white/10 hover:text-white transition-colors">Anderer Account?</Link>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
}
