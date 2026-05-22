import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'motion/react';
import { Calendar, Lock, User } from 'lucide-react';
import { useTheme } from '../lib/theme';

export default function Login() {
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState(searchParams.get('username') || '');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  useTheme();

  useEffect(() => {
    const userParam = searchParams.get('username');
    if (userParam) setUsername(userParam);
  }, [searchParams]);

  // Google Identity Services (member sign-in)
  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) return;

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      const win = window as any;
      if (win.google?.accounts?.id) {
        win.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleResponse,
          auto_select: false,
        });
        win.google.accounts.id.renderButton(
          document.getElementById('google-signin-button'),
          { theme: 'filled_black', size: 'large', width: '100%', shape: 'pill', text: 'signin_with', logo_alignment: 'center' }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) document.body.removeChild(script);
    };
  }, []);

  const handleGoogleResponse = async (response: any) => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/public/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });
      if (res.ok) {
        toast.success('Erfolgreich angemeldet');
        navigate('/');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Google Login fehlgeschlagen');
      }
    } catch (e) {
      toast.error('Netzwerkfehler');
    } finally {
      setIsLoading(false);
    }
  };

  // Try admin first, then member. The backend assigns the role.
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const tryEndpoint = async (endpoint: string) =>
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });

      // 1. Try admin
      let res = await tryEndpoint('/api/auth/login');
      let isAdminAttempt = true;

      // 2. If admin login failed (401/404), try member
      if (!res.ok && (res.status === 401 || res.status === 404)) {
        res = await tryEndpoint('/api/public/login');
        isAdminAttempt = false;
      }

      if (res.ok) {
        toast.success('Erfolgreich angemeldet');
        navigate('/');
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Login fehlgeschlagen');
      }
    } catch (e) {
      toast.error('Netzwerkfehler');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface text-text flex items-center justify-center p-6 selection:bg-accent-muted relative overflow-hidden">
      {/* Premium Ambient Background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,var(--color-accent-muted)_0%,transparent_60%)] pointer-events-none" />
      <div className="absolute -top-1/4 -right-1/4 w-1/2 h-1/2 bg-accent-muted/10 blur-[120px] rounded-full" />
      <div className="absolute -bottom-1/4 -left-1/4 w-1/2 h-1/2 bg-accent-muted/10 blur-[120px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-16 space-y-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="w-24 h-24 bg-surface-elevated text-text rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl relative overflow-hidden group border border-border"
          >
            <Calendar className="w-10 h-10 relative z-10 group-hover:scale-110 transition-transform duration-700" />
            <div className="absolute inset-0 bg-gradient-to-br from-accent-muted/20 to-transparent opacity-50" />
          </motion.div>
          <div className="space-y-4">
            <h1 className="text-6xl font-serif font-bold tracking-tighter leading-none text-text">Einrücken</h1>
            <p className="text-text-dim font-medium text-lg tracking-tight">Melde dich an um fortzufahren.</p>
          </div>
        </div>

        <div className="bg-surface-muted backdrop-blur-3xl border border-border p-8 sm:p-12 rounded-[3.5rem] shadow-[0_32px_128px_rgba(0,0,0,0.2)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent-muted/10 to-transparent pointer-events-none" />

          <form onSubmit={handleLogin} className="space-y-8 relative z-10">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] ml-2">
                Benutzer
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
                  <User className="w-5 h-5 text-text-dim group-focus-within:text-accent transition-all duration-500" />
                </div>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-surface border border-border rounded-[1.8rem] py-6 pl-16 pr-8 text-text placeholder:text-text-dim/30 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all font-medium text-lg"
                  placeholder="Benutzername"
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-text-dim uppercase tracking-[0.2em] ml-2">Passwort</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-7 flex items-center pointer-events-none">
                  <Lock className="w-5 h-5 text-text-dim group-focus-within:text-accent transition-all duration-500" />
                </div>
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-border rounded-[1.8rem] py-6 pl-16 pr-8 text-text placeholder:text-text-dim/30 focus:outline-none focus:ring-4 focus:ring-accent/5 focus:border-accent transition-all font-medium text-lg"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isLoading}
              type="submit"
              className="w-full bg-accent text-surface font-black py-6 rounded-[1.8rem] mt-12 hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center shadow-3xl text-[11px] uppercase tracking-[0.3em]"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-surface/20 border-t-surface rounded-full animate-spin" />
              ) : (
                'Anmelden'
              )}
            </motion.button>

            <div className="mt-6 flex justify-center">
              <div id="google-signin-button" className="w-full max-w-xs"></div>
            </div>
          </form>

          <div className="mt-12 pt-10 border-t border-border flex flex-col gap-6 text-center">
            <p className="text-text-dim/40 text-[9px] font-black uppercase tracking-[0.2em]">
              Interessiert?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-center">
              <Link
                to="/register-request"
                className="text-text-dim hover:text-text text-[10px] font-black uppercase tracking-widest transition-all px-6 py-4 rounded-2xl hover:bg-accent-muted active:scale-95"
              >
                Key beantragen
              </Link>
              <div className="w-1.5 h-1.5 bg-border rounded-full hidden sm:block" />
              <Link
                to="/register"
                className="text-text-dim hover:text-text text-[10px] font-black uppercase tracking-widest transition-all px-6 py-4 rounded-2xl border border-border hover:bg-accent-muted active:scale-95"
              >
                Registrieren
              </Link>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
