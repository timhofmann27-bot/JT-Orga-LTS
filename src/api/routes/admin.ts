import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../../db/index.ts';
import {
  eventSchema,
  inviteSchema,
  bulkInviteSchema,
  settingsSchema,
  personSchema,
  sanitizeText
} from '../schemas.ts';
import { requireAuth, JWT_SECRET, isProd } from '../middleware.ts';

export const adminRouter = Router();
adminRouter.use(requireAuth);

// Events
adminRouter.get('/events', (req, res) => {
  const events = db.prepare(`
    SELECT 
      e.*,
      COUNT(i.id) as total_invites,
      COUNT(CASE WHEN i.status = 'yes' THEN 1 END) as yes_count
    FROM events e
    LEFT JOIN invitees i ON e.id = i.event_id
    GROUP BY e.id
    ORDER BY e.date ASC
  `).all();
  res.json(events);
});
adminRouter.post('/events', (req, res) => {
  try {
    const { title, description, date, location, meeting_point, response_deadline, type } = eventSchema.parse(req.body);
    
    const eventDate = new Date(date);
    const now = new Date();
    
    if (eventDate < now) {
      return res.status(400).json({ error: 'Das Event-Datum darf nicht in der Vergangenheit liegen' });
    }
    
    if (response_deadline) {
      const deadlineDate = new Date(response_deadline);
      if (deadlineDate < now) {
        return res.status(400).json({ error: 'Die Antwortfrist darf nicht in der Vergangenheit liegen' });
      }
      if (deadlineDate > eventDate) {
        return res.status(400).json({ error: 'Die Antwortfrist darf nicht nach dem Event-Datum liegen' });
      }
    }

    const stmt = db.prepare('INSERT INTO events (title, description, date, location, meeting_point, response_deadline, type) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(title, description || null, date, location, meeting_point || null, response_deadline || null, type);
    res.json({ id: info.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});
adminRouter.get('/events/:id', (req, res) => {
  const event = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});
adminRouter.put('/events/:id', (req, res) => {
  try {
    const { title, description, date, location, meeting_point, response_deadline, type } = eventSchema.parse(req.body);

    const eventDate = new Date(date);
    const now = new Date();

    if (eventDate < now) {
      return res.status(400).json({ error: 'Das Event-Datum darf nicht in der Vergangenheit liegen' });
    }

    if (response_deadline) {
      const deadlineDate = new Date(response_deadline);
      if (deadlineDate < now) {
        return res.status(400).json({ error: 'Die Antwortfrist darf nicht in der Vergangenheit liegen' });
      }
      if (deadlineDate > eventDate) {
        return res.status(400).json({ error: 'Die Antwortfrist darf nicht nach dem Event-Datum liegen' });
      }
    }

    const stmt = db.prepare('UPDATE events SET title = ?, description = ?, date = ?, location = ?, meeting_point = ?, response_deadline = ?, type = ? WHERE id = ?');
    stmt.run(title, description || null, date, location, meeting_point || null, response_deadline || null, type, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});
adminRouter.delete('/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Event Invites
adminRouter.get('/events/:id/invites', (req, res) => {
  const invites = db.prepare(`
    SELECT i.*, p.name as current_name 
    FROM invitees i 
    LEFT JOIN persons p ON i.person_id = p.id 
    WHERE i.event_id = ?
  `).all(req.params.id);
  res.json(invites);
});

// Invitation Steps
adminRouter.get('/events/:id/invitation-steps', (req, res) => {
  const steps = db.prepare('SELECT * FROM event_invitation_steps WHERE event_id = ? ORDER BY scheduled_at ASC').all(req.params.id);
  res.json(steps);
});

adminRouter.post('/events/:id/invitation-steps', (req, res) => {
  try {
    const { name, message, scheduled_at } = req.body;
    const stmt = db.prepare('INSERT INTO event_invitation_steps (event_id, name, message, scheduled_at) VALUES (?, ?, ?, ?)');
    const info = stmt.run(req.params.id, name, message, scheduled_at || null);
    res.json({ id: info.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Erstellen des Einladungsschritts' });
  }
});

adminRouter.put('/events/:id/invitation-steps/:stepId', (req, res) => {
  try {
    const { name, message, scheduled_at } = req.body;
    const stmt = db.prepare('UPDATE event_invitation_steps SET name = ?, message = ?, scheduled_at = ? WHERE id = ? AND event_id = ?');
    stmt.run(name, message, scheduled_at || null, req.params.stepId, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Aktualisieren des Einladungsschritts' });
  }
});

adminRouter.delete('/events/:id/invitation-steps/:stepId', (req, res) => {
  db.prepare('DELETE FROM event_invitation_steps WHERE id = ? AND event_id = ?').run(req.params.stepId, req.params.id);
  res.json({ success: true });
});

adminRouter.post('/events/:id/invitation-steps/:stepId/trigger', (req, res) => {
  try {
    const step = db.prepare('SELECT * FROM event_invitation_steps WHERE id = ? AND event_id = ?').get(req.params.stepId, req.params.id) as any;
    if (!step) return res.status(404).json({ error: 'Schritt nicht gefunden' });

    // Logic to send invitations to all invitees of this event
    const invitees = db.prepare('SELECT p.id, p.password_hash FROM invitees i JOIN persons p ON i.person_id = p.id WHERE i.event_id = ?').all(req.params.id) as any[];
    const event = db.prepare('SELECT title FROM events WHERE id = ?').get(req.params.id) as any;

    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_type, user_id, title, message, link)
      VALUES ('person', ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const invitee of invitees) {
        if (invitee.password_hash) {
          insertNotif.run(invitee.id, step.name, step.message, `/events/${req.params.id}`);
        }
      }
      db.prepare('UPDATE event_invitation_steps SET sent_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.stepId);
    })();

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Auslösen des Einladungsschritts' });
  }
});

adminRouter.put('/events/:id/archive', (req, res) => {
  db.prepare('UPDATE events SET is_archived = ? WHERE id = ?').run(req.body.is_archived ? 1 : 0, req.params.id);
  res.json({ success: true });
});

adminRouter.post('/events/:id/invites', (req, res) => {
  try {
    const { person_id } = inviteSchema.parse(req.body);
    const person = db.prepare('SELECT name, password_hash FROM persons WHERE id = ?').get(person_id) as any;
    if (!person) return res.status(404).json({ error: 'Person not found' });

    const token = crypto.randomBytes(16).toString('hex');
    const stmt = db.prepare('INSERT INTO invitees (event_id, person_id, name_snapshot, token) VALUES (?, ?, ?, ?)');
    const info = stmt.run(req.params.id, person_id, person.name, token);

    // Create notification for person ONLY if they have a profile
    if (person.password_hash) {
      const event = db.prepare('SELECT title FROM events WHERE id = ?').get(req.params.id) as any;
      db.prepare(`
        INSERT INTO notifications (user_type, user_id, title, message, link)
        VALUES ('person', ?, ?, ?, ?)
      `).run(person_id, 'Neue Einladung', `Du wurdest zu "${event.title}" eingeladen.`, `/invite/${token}`);
    }

    res.json({ id: info.lastInsertRowid, token, has_profile: !!person.password_hash });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Person ist bereits eingeladen' });
    }
    res.status(400).json({ error: 'Ungültige Eingabedaten' });
  }
});
adminRouter.post('/events/:id/invites/bulk', (req, res) => {
  try {
    const { person_ids } = bulkInviteSchema.parse(req.body);
    const eventId = req.params.id;

    const insert = db.prepare('INSERT INTO invitees (event_id, person_id, name_snapshot, token) VALUES (?, ?, ?, ?)');
    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_type, user_id, title, message, link)
      VALUES ('person', ?, ?, ?, ?)
    `);
    let addedCount = 0;
    const noProfileNames: string[] = [];

    const event = db.prepare('SELECT title FROM events WHERE id = ?').get(eventId) as any;

    db.transaction(() => {
      for (const person_id of person_ids) {
        const existing = db.prepare('SELECT 1 FROM invitees WHERE event_id = ? AND person_id = ?').get(eventId, person_id);
        if (!existing) {
          const person = db.prepare('SELECT name, password_hash FROM persons WHERE id = ?').get(person_id) as any;
          if (person) {
            const token = crypto.randomBytes(16).toString('hex');
            insert.run(eventId, person_id, person.name, token);
            if (person.password_hash) {
              insertNotif.run(person_id, 'Neue Einladung', `Du wurdest zu "${event.title}" eingeladen.`, `/invite/${token}`);
            } else {
              noProfileNames.push(person.name);
            }
            addedCount++;
          }
        }
      }
    })();

    res.json({ success: true, count: addedCount, no_profile_names: noProfileNames });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

adminRouter.post('/events/:id/invites/:inviteId/resend', (req, res) => {
  try {
    const invitee = db.prepare(`
      SELECT i.*, e.title, p.password_hash
      FROM invitees i 
      JOIN events e ON i.event_id = e.id 
      JOIN persons p ON i.person_id = p.id
      WHERE i.id = ? AND i.event_id = ?
    `).get(req.params.inviteId, req.params.id) as any;

    if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });

    if (!invitee.password_hash) {
      return res.status(400).json({ error: 'Person hat noch kein Profil. Bitte Link kopieren und persönlich senden.' });
    }

    db.prepare(`
      INSERT INTO notifications (user_type, user_id, title, message, link)
      VALUES ('person', ?, ?, ?, ?)
    `).run(invitee.person_id, 'Erinnerung: Einladung', `Du bist noch zu "${invitee.title}" eingeladen.`, `/invite/${invitee.token}`);

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim erneuten Senden' });
  }
});

adminRouter.post('/events/:id/remind-pending', (req, res) => {
  try {
    const invitees = db.prepare(`
      SELECT i.person_id, i.token, p.password_hash
      FROM invitees i 
      JOIN persons p ON i.person_id = p.id 
      WHERE i.event_id = ? AND (i.status = 'pending' OR i.status IS NULL)
    `).all(req.params.id) as any[];
    
    const event = db.prepare('SELECT title FROM events WHERE id = ?').get(req.params.id) as any;

    const insertNotif = db.prepare(`
      INSERT INTO notifications (user_type, user_id, title, message, link)
      VALUES ('person', ?, ?, ?, ?)
    `);

    db.transaction(() => {
      for (const invitee of invitees) {
        if (invitee.password_hash) {
          insertNotif.run(invitee.person_id, 'Erinnerung: Abstimmung', `Bitte gib noch deine Rückmeldung zu "${event.title}" ab.`, `/invite/${invitee.token}`);
        }
      }
    })();

    res.json({ success: true, count: invitees.length });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Senden der Erinnerungen' });
  }
});

adminRouter.delete('/events/:id/invites/:inviteId', (req, res) => {
  db.prepare('DELETE FROM invitees WHERE id = ? AND event_id = ?').run(req.params.inviteId, req.params.id);
  res.json({ success: true });
});

adminRouter.put('/events/:id/invites/:inviteId/status', (req, res) => {
  try {
    const { status } = req.body;
    if (status && !['yes', 'no', 'maybe', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status' });
    }
    // Update all editable fields — status, comment, guests_count
    const invite = db.prepare('SELECT * FROM invitees WHERE id = ? AND event_id = ?').get(req.params.inviteId, req.params.id) as any;
    if (!invite) return res.status(404).json({ error: 'Nicht gefunden' });

    const newStatus = status !== undefined ? status : invite.status;
    const newComment = req.body.comment !== undefined ? req.body.comment : invite.comment;
    const newGuests = req.body.guests_count !== undefined ? req.body.guests_count : invite.guests_count;

    db.prepare('UPDATE invitees SET status = ?, comment = ?, guests_count = ? WHERE id = ? AND event_id = ?')
      .run(newStatus, newComment, newGuests, req.params.inviteId, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Aktualisieren' });
  }
});

// Persons
adminRouter.get('/persons', (req, res) => {
  const persons = db.prepare('SELECT id, name, username, email, notes, created_at FROM persons ORDER BY name ASC').all();
  res.json(persons);
});
adminRouter.post('/persons', (req, res) => {
  try {
    const { name, username, email, notes } = personSchema.parse(req.body);
    const stmt = db.prepare('INSERT INTO persons (name, username, email, notes) VALUES (?, ?, ?, ?)');
    const info = stmt.run(name, username || null, email || null, notes || null);
    res.json({ id: info.lastInsertRowid });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});
adminRouter.put('/persons/:id', (req, res) => {
  try {
    const { name, username, email, notes } = personSchema.parse(req.body);
    const stmt = db.prepare('UPDATE persons SET name = ?, username = ?, email = ?, notes = ? WHERE id = ?');
    stmt.run(name, username || null, email || null, notes || null, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername oder E-Mail bereits vergeben' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});
adminRouter.delete('/persons/:id', (req, res) => {
  const personId = req.params.id;
  db.transaction(() => {
    // Delete all invitees linked to this person (orphan cleanup)
    db.prepare('DELETE FROM invitees WHERE person_id = ?').run(personId);
    // Delete notifications
    db.prepare("DELETE FROM notifications WHERE user_type = 'person' AND user_id = ?").run(personId);
    // Delete poll responses
    db.prepare('DELETE FROM poll_responses WHERE person_id = ?').run(personId);
    // Unclaim checklist items
    db.prepare('UPDATE checklists SET claimer_person_id = NULL WHERE claimer_person_id = ?').run(personId);
    // Finally delete the person
    db.prepare('DELETE FROM persons WHERE id = ?').run(personId);
  })();
  res.json({ success: true });

// Clean up orphaned invitees (persons who no longer exist)
adminRouter.delete('/invitees/orphans', (req, res) => {
  const orphans = db.prepare('SELECT i.id FROM invitees i LEFT JOIN persons p ON i.person_id = p.id WHERE i.person_id IS NOT NULL AND p.id IS NULL').all() as any[];
  if (orphans.length > 0) {
    const ids = orphans.map((o: any) => o.id);
    db.prepare('DELETE FROM invitees WHERE id IN (' + ids.join(',') + ')').run();
  }
  // Also delete invitees with NULL person_id (from ON DELETE SET NULL)
  const nulled = db.prepare('DELETE FROM invitees WHERE person_id IS NULL').changes;
  res.json({ cleaned: orphans.length + (nulled || 0) });
});

// CSV Import: POST /persons/import
adminRouter.post('/persons/import', (req, res) => {
  const { csv } = req.body;
  if (!csv || typeof csv !== 'string') return res.status(400).json({ error: 'CSV Daten fehlen' });
  try {
    const lines = csv.split('\n').filter((l: string) => l.trim());
    if (lines.length < 2) return res.status(400).json({ error: 'Mindestens 2 Zeilen (header + daten) erforderlich' });
    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const nameIdx = headers.indexOf('name');
    const userIdx = headers.indexOf('username');
    const emailIdx = headers.indexOf('email');
    if (nameIdx === -1) return res.status(400).json({ error: 'Spalte "name" fehlt im CSV' });
    const stmt = db.prepare('INSERT OR IGNORE INTO persons (name, username, email) VALUES (?, ?, ?)');
    const insertMany = db.transaction((rows: string[][]) => {
      let created = 0;
      for (const row of rows) {
        const name = row[nameIdx]?.trim();
        if (!name) continue;
        const username = userIdx >= 0 ? row[userIdx]?.trim() || null : null;
        const email = emailIdx >= 0 ? row[emailIdx]?.trim() || null : null;
        const info = stmt.run(name, username, email);
        if (info.changes > 0) created++;
      }
      return created;
    });
    const dataRows = lines.slice(1).map(l => l.split(','));
    const created = insertMany(dataRows);
    res.json({ created, total: dataRows.length });
  } catch (e: any) {
    res.status(400).json({ error: 'CSV konnte nicht verarbeitet werden: ' + e.message });
  }
});

// Stats
adminRouter.get('/stats', (req, res) => {
  const totalEvents = db.prepare('SELECT COUNT(*) as count FROM events').get() as any;
  const totalPersons = db.prepare('SELECT COUNT(*) as count FROM persons').get() as any;
  const totalInvites = db.prepare('SELECT COUNT(*) as count FROM invitees').get() as any;
  
  const eventStats = db.prepare(`
    SELECT 
      e.id, 
      e.title, 
      e.date,
      COUNT(i.id) as total_invites,
      COUNT(CASE WHEN i.status = 'yes' THEN 1 END) as yes_count,
      COUNT(CASE WHEN i.status = 'no' THEN 1 END) as no_count,
      COUNT(CASE WHEN i.status = 'maybe' THEN 1 END) as maybe_count,
      COUNT(CASE WHEN i.status = 'pending' OR (i.id IS NOT NULL AND i.status IS NULL) THEN 1 END) as pending_count
    FROM events e
    LEFT JOIN invitees i ON e.id = i.event_id
    GROUP BY e.id
    ORDER BY e.date DESC
  `).all() as any[];

  const eventBreakdown = eventStats.map(e => ({
    ...e,
    yes_pct: e.total_invites > 0 ? (e.yes_count / e.total_invites) * 100 : 0,
    no_pct: e.total_invites > 0 ? (e.no_count / e.total_invites) * 100 : 0,
    maybe_pct: e.total_invites > 0 ? (e.maybe_count / e.total_invites) * 100 : 0,
    pending_pct: e.total_invites > 0 ? (e.pending_count / e.total_invites) * 100 : 0
  }));

  const archivedEvents = db.prepare('SELECT COUNT(*) as count FROM events WHERE is_archived = 1').get() as any;
  const pendingRequests = db.prepare("SELECT COUNT(*) as count FROM registration_requests WHERE status = 'pending'").get() as any;

  res.json({
    events: totalEvents.count,
    archived_events: archivedEvents.count,
    archived_pct: totalEvents.count > 0 ? (archivedEvents.count / totalEvents.count) * 100 : 0,
    persons: totalPersons.count,
    invites: totalInvites.count,
    pending_requests: pendingRequests.count,
    eventBreakdown
  });
});

// Notifications
adminRouter.get('/notifications', (req, res) => {
  const notifs = db.prepare("SELECT * FROM notifications WHERE user_type = 'admin' ORDER BY created_at DESC LIMIT 50").all();
  res.json(notifs);
});

// Registration Requests
adminRouter.get('/registration-requests', (req, res) => {
  const requests = db.prepare('SELECT * FROM registration_requests ORDER BY created_at DESC').all();
  res.json(requests);
});

// Checklist API
adminRouter.get('/events/:id/checklist', (req: any, res) => {
  const items = db.prepare(`
    SELECT c.*, p.name as claimer_name 
    FROM checklists c 
    LEFT JOIN persons p ON c.claimer_person_id = p.id 
    WHERE c.event_id = ?
    ORDER BY c.created_at ASC
  `).all(req.params.id);
  res.json(items);
});

adminRouter.post('/events/:id/checklist', (req, res) => {
  const { item_name, notes } = req.body;
  if (!item_name) return res.status(400).json({ error: 'Name ist erforderlich' });
  const info = db.prepare('INSERT INTO checklists (event_id, item_name, notes) VALUES (?, ?, ?)').run(req.params.id, item_name, notes || null);
  res.json({ id: info.lastInsertRowid });
});

adminRouter.delete('/events/:id/checklist/:itemId', (req, res) => {
  db.prepare('DELETE FROM checklists WHERE id = ? AND event_id = ?').run(req.params.itemId, req.params.id);
  res.json({ success: true });
});

// Polls API
adminRouter.get('/events/:id/polls', (req: any, res) => {
  const polls = db.prepare('SELECT * FROM polls WHERE event_id = ?').all(req.params.id) as any[];
  const result = polls.map(poll => {
    const options = db.prepare('SELECT * FROM poll_options WHERE poll_id = ?').all(poll.id) as any[];
    const optionsWithVotes = options.map(opt => {
      const votes = db.prepare('SELECT p.id, p.name FROM poll_responses pr JOIN persons p ON pr.person_id = p.id WHERE pr.option_id = ?').all(opt.id);
      return { ...opt, votes, vote_count: votes.length };
    });
    return { ...poll, options: optionsWithVotes };
  });
  res.json(result);
});

adminRouter.post('/events/:id/polls', (req, res) => {
  const { question, options } = req.body;
  if (!question || !options || !Array.isArray(options)) return res.status(400).json({ error: 'Frage und Optionen sind erforderlich' });
  
  db.transaction(() => {
    const pollInfo = db.prepare('INSERT INTO polls (event_id, question) VALUES (?, ?)').run(req.params.id, question);
    const pollId = pollInfo.lastInsertRowid;
    const insertOpt = db.prepare('INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)');
    for (const opt of options) {
      insertOpt.run(pollId, opt);
    }
  })();
  res.json({ success: true });
});

adminRouter.delete('/events/:id/polls/:pollId', (req, res) => {
  db.prepare('DELETE FROM polls WHERE id = ? AND event_id = ?').run(req.params.pollId, req.params.id);
  res.json({ success: true });
});

// Messages API (Admin)
adminRouter.get('/events/:id/messages', (req, res) => {
  const msgs = db.prepare(`
    SELECT m.*, p.name as person_name 
    FROM event_messages m 
    LEFT JOIN persons p ON m.person_id = p.id 
    WHERE m.event_id = ? 
    ORDER BY m.created_at DESC
  `).all(req.params.id);
  res.json(msgs);
});

adminRouter.post('/events/:id/messages', (req, res) => {
  const { message } = req.body;
  if (!message || message.trim() === '') return res.status(400).json({ error: 'Nachricht fehlt' });
  const info = db.prepare('INSERT INTO event_messages (event_id, is_admin, message) VALUES (?, 1, ?)').run(req.params.id, sanitizeText(message.trim()));
  res.json({ id: info.lastInsertRowid });
});

adminRouter.delete('/events/:id/messages/:msgId', (req, res) => {
  db.prepare('DELETE FROM event_messages WHERE id = ? AND event_id = ?').run(req.params.msgId, req.params.id);
  res.json({ success: true });
});

adminRouter.put('/registration-requests/:id/approve', (req, res) => {
  try {
    const code = crypto.randomBytes(8).toString('hex').toUpperCase();
    db.prepare("UPDATE registration_requests SET status = 'approved', code = ? WHERE id = ?").run(code, req.params.id);
    
    // Notify the user if we had a way (for now just in DB)
    const request = db.prepare('SELECT * FROM registration_requests WHERE id = ?').get(req.params.id) as any;
    
    res.json({ success: true, code });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Genehmigen' });
  }
});

adminRouter.put('/registration-requests/:id/reject', (req, res) => {
  db.prepare("UPDATE registration_requests SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

adminRouter.delete('/registration-requests/:id', (req, res) => {
  db.prepare('DELETE FROM registration_requests WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

adminRouter.put('/notifications/:id/read', (req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ? AND user_type = 'admin'").run(req.params.id);
  res.json({ success: true });
});

adminRouter.put('/notifications/read-all', (req, res) => {
  db.prepare("UPDATE notifications SET is_read = 1 WHERE user_type = 'admin'").run();
  res.json({ success: true });
});

// Settings
adminRouter.get('/settings', (req: any, res) => {
  const user = db.prepare('SELECT username, avatar_url FROM admin_users WHERE id = ?').get(req.admin.id) as any;
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json({ username: user.username, avatar_url: user.avatar_url || null });
});

// Admin Management
adminRouter.get('/admins', (req, res) => {
  const admins = db.prepare('SELECT id, username FROM admin_users ORDER BY username ASC').all();
  res.json(admins);
});

adminRouter.post('/admins', (req, res) => {
  try {
    const { username, password } = z.object({
      username: z.string().min(3).max(50).transform(sanitizeText),
      password: z.string().min(8).max(100)
    }).parse(req.body);

    const hash = bcrypt.hashSync(password, 10);
    const info = db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
    const adminId = info.lastInsertRowid;

    // Create person for the new admin immediately
    const personInfo = db.prepare('INSERT INTO persons (name, notes) VALUES (?, ?)').run(username, 'Admin Account');
    const personId = personInfo.lastInsertRowid;
    db.prepare('UPDATE admin_users SET person_id = ? WHERE id = ?').run(personId, adminId);

    res.json({ success: true, id: adminId });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername ist bereits vergeben' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Fehler beim Erstellen des Admins' });
  }
});

adminRouter.delete('/admins/:id', (req, res) => {
  if (Number(req.params.id) === (req as any).admin.id) {
    return res.status(400).json({ error: 'Du kannst dich nicht selbst löschen' });
  }
  db.prepare('DELETE FROM admin_users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

adminRouter.put('/settings', (req: any, res) => {
  try {
    const { username, avatar_url, currentPassword, newPassword } = settingsSchema.parse(req.body);

    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.admin.id) as any;
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Aktuelles Passwort wird benötigt' });
      }
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
      }

      const newHash = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE admin_users SET username = ?, avatar_url = ?, password_hash = ? WHERE id = ?')
        .run(username, avatar_url || null, newHash, req.admin.id);
    } else {
      db.prepare('UPDATE admin_users SET username = ?, avatar_url = ? WHERE id = ?')
        .run(username, avatar_url || null, req.admin.id);
    }

    // Keep persons table in sync if username changed
    if (username !== user.username && user.person_id) {
      db.prepare('UPDATE persons SET name = ? WHERE id = ?').run(username, user.person_id);
    }

    const token = jwt.sign({ id: req.admin.id, username: username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('admin_token', token, {
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

adminRouter.get('/recent-responses', (req, res) => {
  const responses = db.prepare(`
    SELECT 
      i.id, i.name_snapshot, i.status, i.comment, i.guests_count, i.responded_at,
      e.id as event_id, e.title as event_title, e.date as event_date
    FROM invitees i
    JOIN events e ON i.event_id = e.id
    WHERE i.responded_at IS NOT NULL
    ORDER BY i.responded_at DESC
    LIMIT 15
  `).all();
  res.json(responses);
});
