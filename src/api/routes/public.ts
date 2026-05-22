import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../../db/index.ts';
import {
  loginSchema,
  registrationRequestSchema,
  registerWithCodeSchema,
  profileUpdateSchema,
  setupProfileSchema,
  respondSchema,
  sanitizeText
} from '../schemas.ts';
import { requirePersonAuth, JWT_SECRET, isProd, loginLimiter } from '../middleware.ts';

export const publicRouter = Router();

publicRouter.get('/profile', requirePersonAuth, (req: any, res) => {
  const user = db.prepare('SELECT username, name, avatar_url FROM persons WHERE id = ?').get(req.person.id) as any;
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json({ username: user.username, name: user.name, avatar_url: user.avatar_url });
});

publicRouter.put('/profile', requirePersonAuth, (req: any, res) => {
  try {
    const { username, name, avatar_url, currentPassword, newPassword } = profileUpdateSchema.parse(req.body);

    const user = db.prepare('SELECT * FROM persons WHERE id = ?').get(req.person.id) as any;
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    const updateName = name || user.name;
    const updateUsername = username || user.username;
    const updateAvatar = avatar_url !== undefined ? avatar_url : user.avatar_url;

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Aktuelles Passwort wird benötigt' });
      }
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE persons SET username = ?, name = ?, avatar_url = ?, password_hash = ? WHERE id = ?')
        .run(updateUsername, updateName, updateAvatar, newHash, req.person.id);
    } else {
      db.prepare('UPDATE persons SET username = ?, name = ?, avatar_url = ? WHERE id = ?')
        .run(updateUsername, updateName, updateAvatar, req.person.id);
    }

    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Daten' });
  }
});

publicRouter.post('/registration-request', (req, res) => {
  try {
    const { name, email } = registrationRequestSchema.parse(req.body);
    db.prepare("INSERT INTO registration_requests (name, email) VALUES (?, ?)").run(name, email || null);
    
    // Notify admin
    db.prepare(`
      INSERT INTO notifications (user_type, title, message, link)
      VALUES ('admin', 'Neue Registrierungsanfrage', ?, '/registration-requests')
    `).run(`${name} möchte Mitglied werden.`);

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

publicRouter.post('/register', (req, res) => {
  try {
    const { code, username, password } = registerWithCodeSchema.parse(req.body);
    
    // Try invite codes first (new system)
    const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(code) as any;
    if (invite) {
      if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
        return res.status(410).json({ error: 'Einladungscode ist abgelaufen' });
      }
      if (invite.used_count >= invite.max_uses) {
        return res.status(410).json({ error: 'Einladungscode bereits vollständig verwendet' });
      }
      
      const hash = bcrypt.hashSync(password, 10);
      const personId = db.transaction(() => {
        const info = db.prepare('INSERT INTO persons (name, username, email, password_hash) VALUES (?, ?, ?, ?)')
          .run(username, username, username + '@invited', hash);
        
        // Update invite usage
        const usedBy = JSON.parse(invite.used_by || '[]');
        usedBy.push(username);
        db.prepare('UPDATE invites SET used_count = used_count + 1, used_by = ? WHERE id = ?')
          .run(JSON.stringify(usedBy), invite.id);
        
        return info.lastInsertRowid;
      })();
      
      const token = jwt.sign({ id: personId, name: username, type: 'person' }, JWT_SECRET, { expiresIn: '30d' });
      res.cookie('person_token', token, { httpOnly: true, secure: true, sameSite: isProd ? 'lax' : 'none' });
      return res.json({ success: true });
    }
    
    // Fallback to old registration_requests flow
    const request = db.prepare("SELECT * FROM registration_requests WHERE code = ? AND status = 'approved'").get(code) as any;
    if (!request) {
      return res.status(400).json({ error: 'Ungültiger oder nicht genehmigter Registrierungscode' });
    }

    const hash = bcrypt.hashSync(password, 10);
    
    const personId = db.transaction(() => {
      // Create person
      const info = db.prepare('INSERT INTO persons (name, username, email, password_hash) VALUES (?, ?, ?, ?)').run(request.name, username, request.email, hash);
      const newId = info.lastInsertRowid;
      
      // Mark request as used (or delete it)
      db.prepare('DELETE FROM registration_requests WHERE id = ?').run(request.id);
      
      // Notify admin about new sign up
      db.prepare(`
        INSERT INTO notifications (user_type, title, message, link)
        VALUES ('admin', 'Neues Mitglied registriert', ?, '/persons')
      `).run(`${request.name} (@${username}) hat sich erfolgreich registriert.`);

      return newId;
    })();

    const token = jwt.sign({ id: personId, name: request.name, type: 'person' }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('person_token', token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: isProd ? 'lax' : 'none' 
    });

    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername ist bereits vergeben' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

publicRouter.post('/login', loginLimiter, (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const person = db.prepare('SELECT * FROM persons WHERE username = ?').get(username) as any;
    
    if (!person || !person.password_hash) {
      return res.status(401).json({ error: 'Dieser Benutzername existiert nicht.' });
    }

    if (person.locked_until && new Date(person.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(person.locked_until).getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Account gesperrt – noch ${remaining} Minute${remaining !== 1 ? 'n' : ''} warten.` });
    }

    if (!bcrypt.compareSync(password, person.password_hash)) {
      const attempts = (person.failed_login_attempts || 0) + 1;
      const remaining = 5 - attempts;
      if (attempts >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60000).toISOString();
        db.prepare('UPDATE persons SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, person.id);
        return res.status(429).json({ error: 'Zu viele Fehlversuche. Account für 30 Minuten gesperrt.' });
      } else {
        db.prepare('UPDATE persons SET failed_login_attempts = ? WHERE id = ?').run(attempts, person.id);
        return res.status(401).json({ error: `Falsches Passwort. Noch ${remaining} Versuch${remaining !== 1 ? 'e' : ''} übrig.` });
      }
    }

    // Success - Reset counters
    db.prepare('UPDATE persons SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(person.id);

    const token = jwt.sign({ id: person.id, name: person.name, type: 'person' }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('person_token', token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: isProd ? 'lax' : 'none' 
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Ungültige Eingabedaten' });
  }
});

publicRouter.post('/logout', (req, res) => {
  res.clearCookie('person_token', {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? 'lax' : 'none'
  });
  res.json({ success: true });
});

publicRouter.get('/check', requirePersonAuth, (req: any, res) => {
  const isAdmin = !!req.cookies.admin_token;
  res.json({ user: req.person, isAdmin });
});

publicRouter.get('/dashboard', requirePersonAuth, (req: any, res) => {
  const personId = req.person.id;
  const invitations = db.prepare(`
    SELECT i.*, e.title, e.date, e.location, e.description, e.response_deadline, e.meeting_point
    FROM invitees i
    JOIN events e ON i.event_id = e.id
    WHERE i.person_id = ?
    ORDER BY e.date ASC
  `).all(personId);
  res.json(invitations);
});

publicRouter.get('/invite/:token', (req, res) => {
  const invitee = db.prepare(`
    SELECT i.*, p.password_hash as has_profile, p.username as suggested_username,
      (SELECT 1 FROM admin_users a WHERE a.person_id = i.person_id) as is_admin_account
    FROM invitees i 
    JOIN persons p ON i.person_id = p.id
    WHERE i.token = ?
  `).get(req.params.token) as any;
  
  if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });

  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(invitee.event_id) as any;
  if (!event) return res.status(404).json({ error: 'Event nicht gefunden' });

  // Get other participants — status intentionally excluded (members must not see each other's yes/no)
  const participants = db.prepare(`
    SELECT p.name, i.guests_count
    FROM invitees i
    JOIN persons p ON i.person_id = p.id
    WHERE i.event_id = ? AND i.id != ? AND i.status IS NOT NULL AND i.status != 'pending'
    ORDER BY p.name ASC
  `).all(event.id, invitee.id);

  // Get checklist
  const checklist = db.prepare(`
    SELECT c.*, p.name as claimer_name 
    FROM checklists c 
    LEFT JOIN persons p ON c.claimer_person_id = p.id 
    WHERE c.event_id = ?
    ORDER BY c.created_at ASC
  `).all(event.id);

  // Get polls
  const pollsData = db.prepare('SELECT * FROM polls WHERE event_id = ?').all(event.id) as any[];
  const polls = pollsData.map(poll => {
    const options = db.prepare('SELECT * FROM poll_options WHERE poll_id = ?').all(poll.id) as any[];
    const optionsWithVotes = options.map(opt => {
      const votes = db.prepare('SELECT p.id, p.name FROM poll_responses pr JOIN persons p ON pr.person_id = p.id WHERE pr.option_id = ?').all(opt.id);
      return { ...opt, votes, vote_count: votes.length };
    });
    return { ...poll, options: optionsWithVotes };
  });

  // Get messages
  const messages = db.prepare(`
    SELECT m.*, p.name as person_name 
    FROM event_messages m 
    LEFT JOIN persons p ON m.person_id = p.id 
    WHERE m.event_id = ? 
    ORDER BY m.created_at DESC
  `).all(event.id);

  res.json({ 
    invitee: { ...invitee, has_profile: !!invitee.has_profile || !!invitee.is_admin_account, is_admin_account: !!invitee.is_admin_account }, 
    aktion: event,
    participants,
    checklist,
    polls,
    messages
  });
});

publicRouter.post('/invite/:token/messages', (req, res) => {
  const { message } = req.body;
  if (!message || message.trim() === '') return res.status(400).json({ error: 'Nachricht fehlt' });
  const invitee = db.prepare('SELECT event_id, person_id FROM invitees WHERE token = ?').get(req.params.token) as any;
  if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });

  const info = db.prepare('INSERT INTO event_messages (event_id, person_id, message) VALUES (?, ?, ?)').run(invitee.event_id, invitee.person_id, sanitizeText(message.trim()));
  res.json({ id: info.lastInsertRowid });
});

publicRouter.delete('/invite/:token/messages/:msgId', (req, res) => {
  const invitee = db.prepare('SELECT event_id, person_id FROM invitees WHERE token = ?').get(req.params.token) as any;
  if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });

  // Security: Only delete if person_id matches!
  const result = db.prepare('DELETE FROM event_messages WHERE id = ? AND event_id = ? AND person_id = ?').run(req.params.msgId, invitee.event_id, invitee.person_id);
  if (result.changes === 0) return res.status(403).json({ error: 'Keine Berechtigung' });
  res.json({ success: true });
});

publicRouter.put('/invite/:token/checklist/:itemId/claim', (req, res) => {
  const invitee = db.prepare('SELECT person_id, event_id FROM invitees WHERE token = ?').get(req.params.token) as any;
  if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });
  
  db.prepare('UPDATE checklists SET claimer_person_id = ? WHERE id = ? AND event_id = ?')
    .run(invitee.person_id, req.params.itemId, invitee.event_id);
  res.json({ success: true });
});

publicRouter.put('/invite/:token/checklist/:itemId/unclaim', (req, res) => {
  const invitee = db.prepare('SELECT person_id, event_id FROM invitees WHERE token = ?').get(req.params.token) as any;
  if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });

  db.prepare('UPDATE checklists SET claimer_person_id = NULL WHERE id = ? AND event_id = ? AND claimer_person_id = ?')
    .run(req.params.itemId, invitee.event_id, invitee.person_id);
  res.json({ success: true });
});

publicRouter.post('/invite/:token/polls/:pollId/vote', (req, res) => {
  const { option_id } = req.body;
  const invitee = db.prepare('SELECT person_id FROM invitees WHERE token = ?').get(req.params.token) as any;
  if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });

  const pollId = req.params.pollId;
  const personId = invitee.person_id;

  // Validate that the option belongs to the poll
  const validOption = db.prepare('SELECT 1 FROM poll_options WHERE id = ? AND poll_id = ?').get(option_id, pollId);
  if (!validOption) {
    return res.status(400).json({ error: 'Ungültige Option für diese Umfrage' });
  }

  db.transaction(() => {
    db.prepare(`
      DELETE FROM poll_responses
      WHERE person_id = ? AND option_id IN (SELECT id FROM poll_options WHERE poll_id = ?)
    `).run(personId, pollId);
    db.prepare('INSERT INTO poll_responses (option_id, person_id) VALUES (?, ?)').run(option_id, personId);
  })();
  res.json({ success: true });
});

publicRouter.post('/invite/:token/setup-profile', (req, res) => {
  try {
    const { username, password } = setupProfileSchema.parse(req.body);
    const invitee = db.prepare('SELECT person_id FROM invitees WHERE token = ?').get(req.params.token) as any;
    if (!invitee || !invitee.person_id) return res.status(404).json({ error: 'Einladung nicht gefunden' });

    const person = db.prepare('SELECT * FROM persons WHERE id = ?').get(invitee.person_id) as any;
    if (person.password_hash) return res.status(400).json({ error: 'Profil bereits erstellt' });

    const hash = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE persons SET username = ?, password_hash = ? WHERE id = ?').run(username, hash, invitee.person_id);

    // Auto login after setup
    const token = jwt.sign({ id: person.id, name: person.name, type: 'person' }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('person_token', token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: isProd ? 'lax' : 'none' 
    });

    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername wird bereits verwendet' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

publicRouter.get('/notifications', requirePersonAuth, (req: any, res) => {
  const notifs = db.prepare("SELECT * FROM notifications WHERE user_type = 'person' AND user_id = ? ORDER BY created_at DESC LIMIT 50").all(req.person.id);
  res.json(notifs);
});

publicRouter.put('/notifications/:id/read', requirePersonAuth, (req: any, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_type = 'person' AND user_id = ?").run(req.params.id, req.person.id);
  res.json({ success: true });
});

publicRouter.put('/notifications/read-all', requirePersonAuth, (req: any, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_type = 'person' AND user_id = ?").run(req.person.id);
  res.json({ success: true });
});

publicRouter.post('/invite/:token/respond', (req, res) => {
  try {
    const { status, comment, guests_count } = respondSchema.parse(req.body);

    // Check deadline
    const invitee = db.prepare('SELECT event_id FROM invitees WHERE token = ?').get(req.params.token) as any;
    if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });
    
    const event = db.prepare('SELECT response_deadline FROM events WHERE id = ?').get(invitee.event_id) as any;
    if (event.response_deadline && new Date() > new Date(event.response_deadline)) {
      return res.status(400).json({ error: 'Die Antwortfrist ist bereits abgelaufen.' });
    }

    const stmt = db.prepare('UPDATE invitees SET status = ?, comment = ?, guests_count = ?, responded_at = CURRENT_TIMESTAMP WHERE token = ?');
    const info = stmt.run(status, comment || null, guests_count || 0, req.params.token);

    if (info.changes === 0) return res.status(404).json({ error: 'Einladung nicht gefunden' });

    // Create notification for admin
    const inviteeDetails = db.prepare(`
      SELECT i.name_snapshot, e.title, e.id as event_id
      FROM invitees i JOIN events e ON i.event_id = e.id
      WHERE i.token = ?
    `).get(req.params.token) as any;

    if (inviteeDetails) {
      let statusText = status === 'yes' ? 'zugesagt' : status === 'no' ? 'abgesagt' : 'mit "Vielleicht" geantwortet';
      const commentSuffix = comment ? ` — Begründung: „${comment}“` : '';
      db.prepare(`
        INSERT INTO notifications (user_type, title, message, link)
        VALUES ('admin', ?, ?, ?)
      `).run(
        'Neue Antwort',
        `${inviteeDetails.name_snapshot} hat für "${inviteeDetails.title}" ${statusText}.${commentSuffix}`,
        `/events/${inviteeDetails.event_id}`
      );
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

// Google OAuth Login
publicRouter.post('/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) return res.status(400).json({ error: 'Google Token fehlt' });

    // Validate token with Google
    const googleRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
    if (!googleRes.ok) return res.status(400).json({ error: 'Ungültiges Google Token' });

    const googleData = await googleRes.json() as any;
    const googleId = googleData.sub;
    const email = googleData.email;
    const name = googleData.name || (email ? email.split('@')[0] : 'User');

    if (!googleId) return res.status(400).json({ error: 'Google ID nicht gefunden' });

    // Check if user exists by google_id
    let person = db.prepare('SELECT * FROM persons WHERE google_id = ?').get(googleId) as any;

    if (!person && email) {
      // Check if user exists by email and link Google account
      person = db.prepare('SELECT * FROM persons WHERE email = ?').get(email) as any;
      if (person) {
        db.prepare('UPDATE persons SET google_id = ?, google_email = ? WHERE id = ?')
          .run(googleId, email, person.id);
      }
    }

    if (!person) {
      // Create new person
      const info = db.prepare('INSERT INTO persons (name, email, google_id, google_email) VALUES (?, ?, ?, ?)')
        .run(name, email || null, googleId, email || null);
      person = { id: info.lastInsertRowid, name };
    }

    // Auto-login
    const token = jwt.sign({ id: person.id, name: person.name, type: 'person' }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('person_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: isProd ? 'lax' : 'none'
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Google Login fehlgeschlagen' });
  }
});
