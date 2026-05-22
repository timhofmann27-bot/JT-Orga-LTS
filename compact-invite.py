#!/usr/bin/env python3
"""Generate compact PublicInvite.tsx from the existing one."""
import re

with open('src/pages/PublicInvite.tsx', 'r') as f:
    content = f.read()

# Keep imports + Countdown component + function signature + all hooks/handlers
# Remove all the massive JSX returns and replace with compact version
first_if = content.index('\n\n  if (error)')
keep = content[:first_if] + '\n'

# Append compact return blocks
compact = '''
  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-muted p-8 rounded-[2rem] border border-border text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-danger/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-danger/60" />
          </div>
          <h1 className="text-xl font-bold text-text mb-2">Link ung\\u00fcltig</h1>
          <p className="text-sm text-text-dim mb-6">{error}</p>
          <Link to="/login" className="text-xs text-accent font-semibold">Zur\\u00fcck zum Login</Link>
        </div>
      </div>
    );
  }

  if (!data) return <div className="min-h-screen bg-surface flex items-center justify-center"><span className="w-6 h-6 border-2 border-text-dim/20 border-t-accent rounded-full animate-spin" /></div>;

  const { aktion, invitee } = data;
  const isDeadlinePassed = aktion?.response_deadline && new Date() > new Date(aktion.response_deadline);

  const getEventIcon = (type) => {
    switch(type) {
      case 'wanderung': return <Compass className="w-5 h-5" />;
      case 'sport': return <Trophy className="w-5 h-5" />;
      case 'demo': return <Megaphone className="w-5 h-5" />;
      case 'spontan': return <Zap className="w-5 h-5" />;
      default: return <Calendar className="w-5 h-5" />;
    }
  };
  const labelMap = { wanderung: 'Wanderung', sport: 'Sport', demo: 'Demo', spontan: 'Spontan' };
  const typeLabel = labelMap[aktion?.type] || 'Einladung';

  if (success) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="bg-surface-muted p-8 rounded-[2rem] border border-border text-center max-w-sm w-full">
          <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-success/60" />
          </div>
          <h1 className="text-xl font-bold text-text mb-2">Erledigt.</h1>
          <p className="text-sm text-text-dim mb-6">Deine Antwort wurde \\u00fcbermittelt.</p>
          <div className="bg-surface-elevated p-4 rounded-xl border border-border mb-6 text-left">
            <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">Dein Status</p>
            <div className="flex items-center gap-3">
              <span className={\`w-2.5 h-2.5 rounded-full \${status === 'yes' ? 'bg-success' : status === 'no' ? 'bg-danger' : 'bg-warning'}\`} />
              <span className="font-bold text-text">
                {status === 'yes' ? 'Dabei' : status === 'no' ? 'Abgesagt' : 'Vielleicht'}
              </span>
            </div>
            {guestsCount > 0 && <p className="text-xs text-text-dim mt-2">+{guestsCount} G\\u00e4ste</p>}
          </div>
          <Link to="/" className="block w-full bg-accent text-white font-bold py-3 rounded-xl text-sm tracking-wide hover:opacity-90 transition-all">
            Zur App
          </Link>
          <button onClick={() => setSuccess(false)} className="text-xs text-text-dim mt-4 hover:text-text transition-colors">Antwort \\u00e4ndern</button>
        </div>
      </div>
    );
  }

  const s = aktion;
  return (
    <div className="min-h-screen bg-surface pb-28">
      {/* Admin back button */}
      {isAdmin && (
        <div className="sticky top-4 z-50 px-4">
          <Link to="/" className="inline-flex items-center gap-2 px-3 py-2 bg-surface-muted border border-border rounded-xl text-xs text-text-dim hover:text-text transition-colors">
            <Calendar className="w-3.5 h-3.5" /> Admin
          </Link>
        </div>
      )}

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* Event header */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span className="text-[10px] font-bold text-accent uppercase tracking-wider">{typeLabel}</span>
          </div>
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 shrink-0 bg-surface-elevated rounded-xl flex items-center justify-center border border-border text-text-dim">
              {getEventIcon(aktion?.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-text">{s?.title}</h1>
              <p className="text-xs text-text-dim mt-1">
                {invitee?.name_snapshot ? \`Hallo \${invitee.name_snapshot}\` : ''}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Zeit</p>
              <p className="text-sm font-bold text-text">{s?.date ? format(parseISO(s.date), 'EEEE, dd. MMM', { locale: de }) : '-'}</p>
              <p className="text-xs text-text-dim">{s?.date ? format(parseISO(s.date), 'HH:mm') : ''} Uhr</p>
            </div>
            <div>
              <p className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-1">Ort</p>
              <p className="text-sm font-bold text-text truncate">{s?.location || '-'}</p>
              {s?.meeting_point && <p className="text-xs text-text-dim mt-1">{s.meeting_point}</p>}
            </div>
          </div>

          {/* Weather chip */}
          {weather && (
            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-surface-elevated border border-border rounded-xl w-fit text-xs text-text-dim">
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-bold text-text">{weather.day2.temp}\\u00b0</span>
              <span>{weather.day2.condition}</span>
            </div>
          )}

          {/* Description */}
          {s?.description && (
            <p className="mt-4 text-sm text-text-dim italic border-t border-border pt-4">\\u201c{s.description}\\u201d</p>
          )}
        </div>

        {/* Map + Transit */}
        {s?.location && (
          <div className="bg-surface-muted border border-border rounded-2xl overflow-hidden">
            <div className="h-48 bg-surface-elevated relative">
              <MapComponent location={s.location} />
            </div>
            <div className="flex gap-2 p-3">
              <button onClick={() => setShowTransit(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-surface-elevated border border-border rounded-xl text-xs font-semibold text-text-dim hover:text-text transition-colors active:scale-95">
                <Train className="w-3.5 h-3.5" /> Anfahrt
              </button>
              <button onClick={() => generateVCalendar(s, window.location.href)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-text text-surface rounded-xl text-xs font-semibold hover:opacity-90 transition-all active:scale-95">
                <Calendar className="w-3.5 h-3.5" /> Kalender
              </button>
            </div>
          </div>
        )}

        {/* Response deadline countdown */}
        {s?.response_deadline && !isDeadlinePassed && invitee.status === 'pending' && (
          <div className="bg-danger/5 border border-danger/20 rounded-2xl p-4 text-center">
            <Countdown deadline={s.response_deadline} />
          </div>
        )}

        {/* Response form */}
        <div className="bg-surface-muted border border-border rounded-2xl p-5">
          <h2 className="text-sm font-bold text-text mb-4">R\\u00fcckmeldung</h2>
          {isDeadlinePassed && (
            <div className="bg-danger/5 text-danger/70 text-xs font-bold uppercase tracking-wider text-center p-3 rounded-xl border border-danger/10 mb-4">Frist abgelaufen</div>
          )}
          <div className={\`grid grid-cols-3 gap-2 mb-4 \${isDeadlinePassed ? 'opacity-20 pointer-events-none' : ''}\`}>
            {[
              { id: 'yes', label: 'Dabei', icon: CheckCircle },
              { id: 'no', label: 'Absagen', icon: XCircle },
              { id: 'maybe', label: 'Vielleicht', icon: HelpCircle }
            ].map(opt => (
              <label key={opt.id}
                className={\`flex flex-col items-center gap-1.5 p-3 rounded-xl border cursor-pointer transition-all \${
                  status === opt.id ? 'bg-accent text-white border-accent' : 'bg-surface-elevated border-border hover:border-accent/30'
                }\`}>
                <input type="radio" name="status" value={opt.id} className="sr-only"
                  checked={status === opt.id} onChange={() => setStatus(opt.id)} disabled={isDeadlinePassed} />
                <opt.icon className={\`w-4 h-4 \${status === opt.id ? 'text-white' : 'text-text-dim'}\`} />
                <span className={\`text-[9px] font-bold uppercase tracking-wider \${status === opt.id ? 'text-white' : 'text-text-dim'}\`}>{opt.label}</span>
              </label>
            ))}
          </div>

          {status === 'yes' && (
            <div className={\`mb-4 \${isDeadlinePassed ? 'opacity-30' : ''}\`}>
              <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider mb-2">G\\u00e4ste</p>
              <div className="flex gap-1.5">
                {[0,1,2,3,4].map(n => (
                  <button key={n} type="button" onClick={() => setGuestsCount(n)} disabled={isDeadlinePassed}
                    className={\`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-all \${
                      guestsCount === n ? 'bg-accent text-white border-accent' : 'bg-surface-elevated text-text-dim border-border'
                    }\`}>
                    {n === 0 ? '0' : \`+\${n}\`}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={\`mb-4 \${isDeadlinePassed ? 'opacity-30' : ''}\`}>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Notiz..." disabled={isDeadlinePassed}
              className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-sm text-text placeholder:text-text-dim/30 outline-none focus:border-accent/40 transition-all resize-none min-h-[60px]" />
          </div>

          {!isDeadlinePassed && (
            <button onClick={() => handleSubmit()} disabled={!status}
              className="w-full bg-accent text-white font-bold py-3 rounded-xl text-sm tracking-wide hover:opacity-90 disabled:opacity-20 transition-all active:scale-[0.98]">
              R\\u00fcckmeldung senden
            </button>
          )}
        </div>

        {/* Checklist */}
        {checklist.length > 0 && (
          <div className="bg-surface-muted border border-border rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-text">Mitbringliste</h2>
              <button onClick={fetchUpdatedData} className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center text-text-dim hover:text-text transition-all">
                <Repeat className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {checklist.map(item => {
                const isMe = item.claimer_person_id === invitee.person_id;
                const isOther = item.claimer_person_id && !isMe;
                return (
                  <div key={item.id} className={\`flex items-center justify-between p-3 rounded-xl border \${
                    isMe ? 'bg-accent/10 border-accent/30' : isOther ? 'bg-surface-elevated border-border opacity-60' : 'bg-surface-elevated border-border'
                  }\`}>
                    <div className="flex-1 min-w-0">
                      <p className={\`text-sm font-semibold truncate \${item.claimer_person_id ? 'text-text-dim' : 'text-text'}\`}>{item.item_name}</p>
                      {item.notes && <p className="text-xs text-text-dim">{item.notes}</p>}
                      {isOther && <p className="text-[10px] text-text-dim mt-1">{item.claimer_name}</p>}
                      {isMe && <p className="text-[10px] text-accent font-semibold mt-1">\\u2713 Von dir</p>}
                    </div>
                    {!item.claimer_person_id ? (
                      <button onClick={() => handleClaimItem(item.id)}
                        className="px-3 py-1.5 bg-text text-surface rounded-lg text-[10px] font-bold hover:opacity-90 active:scale-95">Ich!</button>
                    ) : isMe ? (
                      <button onClick={() => handleUnclaimItem(item.id)}
                        className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-accent hover:bg-danger/20 hover:text-danger active:scale-90 transition-all">
                        <XCircle className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-surface-elevated border border-border flex items-center justify-center"><Lock className="w-3.5 h-3.5 text-text-dim/30" /></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Polls */}
        {polls.length > 0 && (
          <div className="space-y-3">
            {polls.map(poll => (
              <div key={poll.id} className="bg-surface-muted border border-border rounded-2xl p-5">
                <h3 className="text-sm font-bold text-text mb-4">{poll.question}</h3>
                <div className="space-y-2">
                  {poll.options.map((opt) => {
                    const voted = opt.votes?.some(v => v.id === invitee.person_id);
                    const total = poll.options.reduce((a, b) => a + b.vote_count, 0);
                    const pct = total > 0 ? (opt.vote_count / total) * 100 : 0;
                    return (
                      <button key={opt.id} onClick={() => handleVote(poll.id, opt.id)}
                        className={\`w-full relative h-10 rounded-xl overflow-hidden border transition-all \${
                          voted ? 'border-accent bg-accent/5' : 'border-border bg-surface-elevated hover:bg-surface-elevated/80'
                        }\`}>
                        <div className="absolute inset-y-0 left-0 bg-accent/10" style={{width: pct + '%'}} />
                        <div className="relative h-full flex items-center justify-between px-4">
                          <span className={\`text-xs font-bold uppercase tracking-wider \${voted ? 'text-accent' : 'text-text-dim'}\`}>{opt.option_text}</span>
                          <span className="text-[10px] text-text-dim font-bold">{opt.vote_count}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pinnwand */}
        <div className="bg-surface-muted border border-border rounded-2xl