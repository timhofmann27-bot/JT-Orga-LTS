import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Info, BarChart2, CheckCircle, X, ChevronRight, PartyPopper, Megaphone } from 'lucide-react';
import toast from 'react-hot-toast';

interface PollOption {
  id: number;
  label: string;
  vote_count: number;
  i_voted: number;
  voters?: { id: number; name: string }[];
}

interface BoardPost {
  id: number;
  type: 'info' | 'poll';
  title: string;
  content?: string;
  author_name: string;
  author_person_id: number | null;
  created_at: string;
  options?: PollOption[];
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Gerade eben';
  if (mins < 60) return `vor ${mins} Min.`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `vor ${hrs} Std.`;
  return `vor ${Math.floor(hrs / 24)} Tagen`;
}

export default function Pinnwand() {
  const [posts, setPosts] = useState<BoardPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [myPersonId, setMyPersonId] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [form, setForm] = useState({
    type: 'info' as 'info' | 'poll',
    title: '',
    content: '',
    options: ['', ''],
  });
  const [submitting, setSubmitting] = useState(false);
  const [justPosted, setJustPosted] = useState(false);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.user) {
          const admin = data.user.role === 'admin';
          setIsAdmin(admin);
          // For members, user.id == person_id; admins use isAdmin flag for delete access
          if (!admin) setMyPersonId(data.user.id);
        }
      });
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/api/board/posts');
      if (r.ok) setPosts(await r.json());
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return toast.error('Titel fehlt');
    if (form.type === 'poll' && form.options.filter(o => o.trim()).length < 2)
      return toast.error('Mindestens 2 Antwortoptionen angeben');

    setSubmitting(true);
    try {
      const body: any = { type: form.type, title: form.title.trim() };
      if (form.type === 'info' && form.content.trim()) body.content = form.content.trim();
      if (form.type === 'poll') body.options = form.options.filter(o => o.trim());

      const r = await fetch('/api/board/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      setShowCreate(false);
      setJustPosted(true);
      setForm({ type: 'info', title: '', content: '', options: ['', ''] });
      setTimeout(() => setJustPosted(false), 1500);
      load();
    } catch (err: any) {
      toast.error(err.message || 'Fehler beim Erstellen');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVote(postId: number, optionId: number) {
    const r = await fetch(`/api/board/posts/${postId}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ optionId }),
    });
    if (!r.ok) { toast.error((await r.json()).error || 'Fehler'); return; }
    load();
  }

  async function handleUnvote(postId: number) {
    const r = await fetch(`/api/board/posts/${postId}/vote`, { method: 'DELETE' });
    if (!r.ok) { toast.error((await r.json()).error || 'Fehler'); return; }
    toast.success('Stimme zurückgenommen');
    load();
  }

  async function handleDelete(postId: number) {
    try {
      const r = await fetch(`/api/board/posts/${postId}`, { method: 'DELETE' });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        toast.error(err.error || 'Fehler beim Löschen');
        return;
      }
      toast.success('Gelöscht');
      setPosts(p => p.filter(x => x.id !== postId));
    } catch (e) {
      toast.error('Verbindungsfehler');
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="font-serif font-black text-4xl sm:text-5xl tracking-tighter text-text">
            Pinnwand
          </h1>
          <p className="text-text/40 mt-1 text-sm font-medium">Infos &amp; Umfragen für alle</p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-accent text-surface px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-lg hover:bg-accent/90 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Beitrag</span>
        </motion.button>
      </div>

      {/* Success banner */}
      <AnimatePresence>
        {justPosted && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-6 p-4 rounded-2xl bg-success/10 border border-success/30 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
              <PartyPopper className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="font-black text-success text-sm">Beitrag veröffentlicht! 🎉</p>
              <p className="text-xs text-success/70">Alle Mitglieder wurden benachrichtigt.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => (
            <div key={i} className="premium-card rounded-3xl p-6 animate-pulse">
              <div className="h-4 bg-surface-elevated rounded w-2/3 mb-3" />
              <div className="h-3 bg-surface-elevated rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 && !justPosted ? (
        <div className="text-center py-24 text-text/30">
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-surface-elevated border border-border flex items-center justify-center">
            <Megaphone className="w-10 h-10 opacity-20" />
          </div>
          <p className="font-serif text-xl italic">Noch nichts auf der Pinnwand</p>
          <p className="text-sm mt-1">Erstell den ersten Beitrag!</p>
        </div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {posts.map(post => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                className="premium-card rounded-3xl p-6 border border-border relative group"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${post.type === 'poll' ? 'bg-accent/10 text-accent' : 'bg-surface-elevated text-text/50'}`}>
                      {post.type === 'poll' ? <BarChart2 className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.2em] text-text/30">
                        {post.type === 'poll' ? 'Umfrage' : 'Info'} · {post.author_name} · {timeAgo(post.created_at)}
                      </p>
                      <h3 className="font-serif font-bold text-lg text-text tracking-tight leading-tight mt-0.5">
                        {post.title}
                      </h3>
                    </div>
                  </div>
                  {(isAdmin || post.author_person_id === myPersonId) && (
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-text/30 hover:text-danger p-1.5 rounded-lg hover:bg-danger/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Info content */}
                {post.type === 'info' && post.content && (
                  <p className="text-text/70 text-sm leading-relaxed pl-10">{post.content}</p>
                )}

                {/* Poll options */}
                {post.type === 'poll' && post.options && (() => {
                  const total = post.options.reduce((s, o) => s + o.vote_count, 0);
                  const myVoteId = post.options.find(o => o.i_voted)?.id;
                  return (
                    <div className="space-y-2 pl-10">
                      {post.options.map(opt => {
                        const pct = total > 0 ? Math.round((opt.vote_count / total) * 100) : 0;
                        const voted = opt.id === myVoteId;
                        const voterNames = isAdmin && opt.voters?.map(v => v.name).join(', ');
                        return (
                          <button
                            key={opt.id}
                            onClick={() => handleVote(post.id, opt.id)}
                            className={`w-full text-left relative overflow-hidden rounded-xl border transition-all ${voted ? 'border-accent bg-accent/5' : 'border-border hover:border-text/20 bg-surface-elevated'}`}
                          >
                            <div
                              className="absolute inset-y-0 left-0 bg-accent/10 transition-all"
                              style={{ width: `${pct}%` }}
                            />
                            <div className="relative flex items-center justify-between px-4 py-3 gap-3">
                              <div className="flex items-center gap-2 truncate">
                                {voted && <CheckCircle className="w-3.5 h-3.5 text-accent shrink-0" />}
                                <span className={`text-sm font-semibold truncate ${voted ? 'text-accent' : 'text-text/80'}`}>{opt.label}</span>
                              </div>
                              <span className="text-[11px] font-black text-text/40 shrink-0">{pct}% · {opt.vote_count}</span>
                            </div>
                            {isAdmin && voterNames && opt.vote_count > 0 && (
                              <div className="relative px-4 pb-2 text-[10px] text-text/30 leading-tight">
                                {voterNames}
                              </div>
                            )}
                          </button>
                        );
                      })}
                      <div className="flex items-center justify-between pt-1">
                        <p className="text-[10px] text-text/30 font-medium">{total} {total === 1 ? 'Stimme' : 'Stimmen'}</p>
                        {myVoteId != null && (
                          <button
                            onClick={() => handleUnvote(post.id)}
                            className="text-[10px] text-text/30 hover:text-danger font-semibold transition-colors"
                          >
                            ← Stimme zurücknehmen
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Create modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-text/40 backdrop-blur-sm"
            onClick={e => { if (e.target === e.currentTarget) setShowCreate(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="w-full max-w-lg bg-surface rounded-t-3xl sm:rounded-3xl border border-border shadow-2xl flex flex-col"
              style={{ maxHeight: '90dvh' }}
            >
              <div className="overflow-y-auto overscroll-contain flex-1 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif font-black text-2xl tracking-tight">Neuer Beitrag</h2>
                <button onClick={() => setShowCreate(false)} className="text-text/40 hover:text-text p-1.5 rounded-xl hover:bg-surface-elevated transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Type toggle */}
                <div className="flex gap-2 bg-surface-elevated rounded-xl p-1">
                  {(['info', 'poll'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, type: t }))}
                      className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-[0.15em] transition-all ${form.type === t ? 'bg-surface text-accent border border-border shadow-sm' : 'text-text/40 hover:text-text'}`}
                    >
                      {t === 'poll' ? <BarChart2 className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                      {t === 'poll' ? 'Umfrage' : 'Info'}
                    </button>
                  ))}
                </div>

                <input
                  className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm font-semibold text-text placeholder:text-text/30 focus:outline-none focus:border-accent/50 transition-colors"
                  placeholder={form.type === 'poll' ? 'Frage stellen...' : 'Titel / Betreff...'}
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  maxLength={200}
                  required
                />

                {form.type === 'info' && (
                  <textarea
                    className="w-full bg-surface-elevated border border-border rounded-xl px-4 py-3 text-sm text-text placeholder:text-text/30 focus:outline-none focus:border-accent/50 transition-colors resize-none"
                    placeholder="Nachricht (optional)..."
                    rows={3}
                    value={form.content}
                    onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                    maxLength={2000}
                  />
                )}

                {form.type === 'poll' && (
                  <div className="space-y-2">
                    {form.options.map((opt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          className="flex-1 bg-surface-elevated border border-border rounded-xl px-4 py-2.5 text-sm font-medium text-text placeholder:text-text/30 focus:outline-none focus:border-accent/50 transition-colors"
                          placeholder={`Option ${i + 1}`}
                          value={opt}
                          onChange={e => {
                            const opts = [...form.options];
                            opts[i] = e.target.value;
                            setForm(f => ({ ...f, options: opts }));
                          }}
                          maxLength={200}
                        />
                        {form.options.length > 2 && (
                          <button type="button" onClick={() => setForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))} className="text-text/30 hover:text-danger p-2">
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {form.options.length < 10 && (
                      <button
                        type="button"
                        onClick={() => setForm(f => ({ ...f, options: [...f.options, ''] }))}
                        className="text-accent text-xs font-bold flex items-center gap-1.5 hover:underline"
                      >
                        <Plus className="w-3.5 h-3.5" /> Option hinzufügen
                      </button>
                    )}
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-accent text-surface font-black py-3.5 rounded-2xl text-[10px] uppercase tracking-[0.25em] hover:bg-accent/90 transition-all disabled:opacity-50"
                >
                  {submitting ? 'Wird erstellt...' : 'Veröffentlichen'}
                </motion.button>
              </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
