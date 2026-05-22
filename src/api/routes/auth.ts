import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db } from '../../db/index.ts';
import { loginSchema } from '../schemas.ts';
import { loginLimiter, requireAuth, JWT_SECRET, isProd } from '../middleware.ts';

export const authRouter = Router();
authRouter.post('/login', loginLimiter, (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Dieser Benutzername existiert nicht.' });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      const remaining = Math.ceil((new Date(user.locked_until).getTime() - Date.now()) / 60000);
      return res.status(429).json({ error: `Account gesperrt – noch ${remaining} Minute${remaining !== 1 ? 'n' : ''} warten.` });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      const remaining = 5 - attempts;
      if (attempts >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60000).toISOString();
        db.prepare('UPDATE admin_users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
        return res.status(429).json({ error: 'Zu viele Fehlversuche. Account für 30 Minuten gesperrt.' });
      } else {
        db.prepare('UPDATE admin_users SET failed_login_attempts = ? WHERE id = ?').run(attempts, user.id);
        return res.status(401).json({ error: `Falsches Passwort. Noch ${remaining} Versuch${remaining !== 1 ? 'e' : ''} übrig.` });
      }
    }

    // Success - Reset counters
    db.prepare('UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('admin_token', token, { 
      httpOnly: true, 
      secure: true, 
      sameSite: isProd ? 'lax' : 'none' 
    });
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Ungültige Eingabedaten' });
  }
});
authRouter.post('/logout', (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? 'lax' : 'none'
  });
  res.json({ success: true });
});
authRouter.get('/check', requireAuth, (req: any, res) => {
  res.json({ user: req.admin });
});

// ── Invite System ───────────────────────────────
function generateInviteCode(): string {
  return crypto.randomBytes(6).toString('base64url').toUpperCase().slice(0, 8);
}

// List all invites (admin only)
authRouter.get('/invites', requireAuth, (req, res) => {
  const invites = db.prepare('SELECT * FROM invites ORDER BY created_at DESC').all();
  res.json(invites);
});

// Create invite (admin only)
authRouter.post('/invite', requireAuth, (req: any, res) => {
  try {
    const { role = 'member', maxUses = 5 } = req.body;
    const code = generateInviteCode();
    db.prepare(
      'INSERT INTO invites (code, role, max_uses, created_by) VALUES (?, ?, ?, ?)'
    ).run(code, role, maxUses, req.admin.username);
    res.json({ code, role, maxUses });
  } catch (e) {
    res.status(500).json({ error: 'Fehler beim Erstellen der Einladung' });
  }
});

// Delete invite (admin only)
authRouter.delete('/invite/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM invites WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Verify invite code (public)
authRouter.get('/invite/verify/:code', (req, res) => {
  const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(req.params.code) as any;
  if (!invite) return res.status(404).json({ error: 'Ungültiger Einladungscode' });
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return res.status(410).json({ error: 'Einladungscode ist abgelaufen' });
  }
  if (invite.used_count >= invite.max_uses) {
    return res.status(410).json({ error: 'Einladungscode bereits vollständig verwendet' });
  }
  res.json({ valid: true, role: invite.role });
});

// Register with invite code
authRouter.post('/register', loginLimiter, (req, res) => {
  try {
    const { username, password, inviteCode } = req.body;
    if (!username || !password || !inviteCode) {
      return res.status(400).json({ error: 'Benutzername, Passwort und Einladungscode sind erforderlich' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen lang sein' });
    }

    // Validate invite
    const invite = db.prepare('SELECT * FROM invites WHERE code = ?').get(inviteCode) as any;
    if (!invite) return res.status(400).json({ error: 'Ungültiger Einladungscode' });
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return res.status(400).json({ error: 'Einladungscode ist abgelaufen' });
    }
    if (invite.used_count >= invite.max_uses) {
      return res.status(400).json({ error: 'Einladungscode bereits vollständig verwendet' });
    }

    // Check if username exists
    const existing = db.prepare('SELECT id FROM admin_users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: 'Benutzername bereits vergeben' });

    // Create user
    const hash = bcrypt.hashSync(password, 12);
    db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);

    // Update invite usage
    const usedBy = JSON.parse(invite.used_by || '[]');
    usedBy.push(username);
    db.prepare('UPDATE invites SET used_count = used_count + 1, used_by = ? WHERE id = ?')
      .run(JSON.stringify(usedBy), invite.id);

    // Also create person record
    db.prepare('INSERT INTO persons (name, username, email) VALUES (?, ?, ?)')
      .run(username, username, username + '@invited');

    res.json({ success: true, message: 'Registrierung erfolgreich' });
  } catch (e: any) {
    res.status(500).json({ error: 'Registrierung fehlgeschlagen: ' + e.message });
  }
});
