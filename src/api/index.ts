import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../db/index.ts';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import sanitizeHtml from 'sanitize-html';
import { sendPushNotification, notifyEventUpdate, notifyNewMessage, sendBroadcastNotification } from '../services/fcmService.ts';

export const apiRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET (or SESSION_SECRET) is not set in environment variables.');
  process.exit(1);
}

const isProd = process.env.NODE_ENV === 'production';

// Request ID middleware for tracing
apiRouter.use((req: any, res: any, next: any) => {
  req.requestId = crypto.randomUUID();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Global error handler - never leak internal errors
apiRouter.use((err: any, req: any, res: any, next: any) => {
  console.error(`[${req.requestId}] Error:`, err.message);
  res.status(500).json({
    error: 'Ein interner Fehler ist aufgetreten.',
    requestId: req.requestId
  });
});

// Content-Type validation middleware — only enforce JSON when a body is sent.
// Action-style endpoints (approve, mark-read, claim) often send no body and
// must still be allowed.
apiRouter.use((req: any, res: any, next: any) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.path !== '/health') {
    const contentLength = req.get('Content-Length');
    const hasBody = contentLength && Number(contentLength) > 0;
    if (hasBody) {
      const contentType = req.get('Content-Type');
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(415).json({ error: 'Content-Type must be application/json' });
      }
    }
  }
  next();
});

// Token blacklist for revocation
db.exec(`
  CREATE TABLE IF NOT EXISTS token_blacklist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token_hash TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Audit log table
db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_type TEXT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT
  )
`);

function logAudit(userType: string | null, userId: number | null, action: string, details: object, ipAddress: string | undefined) {
  db.prepare('INSERT INTO audit_log (user_type, user_id, action, details, ip_address) VALUES (?, ?, ?, ?, ?)')
    .run(userType, userId, action, JSON.stringify(details), ipAddress || null);
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// --- RATE LIMITING ---
// General API Rate Limiter
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per `window`
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});
apiRouter.use(apiLimiter);

// Health check endpoints
apiRouter.get('/health', (req, res) => {
  // Basic health check - always returns OK
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

apiRouter.get('/health/ready', (req, res) => {
  // Readiness check - verifies all dependencies
  try {
    // Check database connection
    db.prepare('SELECT 1').get();

    res.json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok'
      }
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'error'
      }
    });
  }
});

apiRouter.get('/health/live', (req, res) => {
  // Liveness check - is the process alive?
  res.json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    pid: process.pid
  });
});

// --- AUTH MIDDLEWARE ---
const isTokenBlacklisted = (token: string): boolean => {
  const tokenHash = hashToken(token);
  const blacklisted = db.prepare('SELECT 1 FROM token_blacklist WHERE token_hash = ?').get(tokenHash);
  return !!blacklisted;
};

const requireAuth = (req: any, res: any, next: any) => {
  const adminToken = req.cookies.admin_token;
  const personToken = req.cookies.person_token;

  // 1) Try admin token first (full admin role)
  if (adminToken) {
    if (isTokenBlacklisted(adminToken)) {
      console.warn(`[requireAuth] Admin token is blacklisted. Path: ${req.path}`);
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as { id: number; username: string };
      req.admin = decoded;
      req.adminToken = adminToken;
      req.role = 'admin';
      return next();
    } catch (err) {
      console.error(`[requireAuth] Admin token verification failed. Error: ${err instanceof Error ? err.message : 'Unknown'}`);
      // fall through to try person token
    }
  }

  // 2) Try person token (member role — limited access enforced per-route via requireFullAdmin)
  if (personToken) {
    if (isTokenBlacklisted(personToken)) {
      console.warn(`[requireAuth] Person token is blacklisted. Path: ${req.path}`);
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    try {
      const decoded = jwt.verify(personToken, JWT_SECRET) as { id: number; name: string; type: string };
      if (decoded.type !== 'person') throw new Error('Not a person token');
      // Synthesize an admin-shaped context so existing handlers (audit logs, FCM tokens, etc.)
      // that read req.admin.id / req.admin.username keep working for member users.
      req.admin = { id: decoded.id, username: decoded.name };
      req.person = decoded;
      req.personToken = personToken;
      req.role = 'member';
      return next();
    } catch (err) {
      console.error(`[requireAuth] Person token verification failed. Error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
  }

  console.warn(`[requireAuth] No valid auth cookie. Path: ${req.path}`);
  return res.status(401).json({ error: 'Unauthorized' });
};

// Restricts a route to true admins only. Use AFTER requireAuth.
const requireFullAdmin = (req: any, res: any, next: any) => {
  if (req.role !== 'admin') {
    return res.status(403).json({ error: 'Nur für Administratoren zugänglich.' });
  }
  next();
};

const requirePersonAuth = (req: any, res: any, next: any) => {
  const personToken = req.cookies.person_token;
  const adminToken = req.cookies.admin_token;

  if (personToken) {
    if (isTokenBlacklisted(personToken)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    try {
      const decoded = jwt.verify(personToken, JWT_SECRET) as { id: number; name: string; type: string };
      if (decoded.type !== 'person') throw new Error('Not a person token');
      req.person = decoded;
      req.personToken = personToken;
      return next();
    } catch (err) {
      // fall through
    }
  }

  if (adminToken) {
    if (isTokenBlacklisted(adminToken)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as { id: number; username: string };
      const admin = db.prepare('SELECT person_id FROM admin_users WHERE id = ?').get(decoded.id) as { person_id: number } | undefined;
      if (admin?.person_id) {
        req.person = { id: admin.person_id, name: decoded.username, type: 'person' };
        req.adminToken = adminToken;
        return next();
      }
    } catch (err) {
      // fall through
    }
  }

  res.status(401).json({ error: 'Unauthorized' });
};

// --- RATE LIMITING ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window`
  message: { error: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 registration requests per hour
  message: { error: 'Zu viele Registrierungsversuche. Bitte in einer Stunde erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

const registrationRequestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 registration requests per hour
  message: { error: 'Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});

// --- SCHEMAS ---
const sanitizeText = (val: string) => sanitizeHtml(val, { allowedTags: [], allowedAttributes: {} });

// Strong password validation: min 12 chars, uppercase, lowercase, number, special char
const strongPassword = z.string()
  .min(12, 'Passwort muss mindestens 12 Zeichen lang sein')
  .max(100, 'Passwort ist zu lang')
  .regex(/[A-Z]/, 'Passwort muss mindestens einen Großbuchstaben enthalten')
  .regex(/[a-z]/, 'Passwort muss mindestens einen Kleinbuchstaben enthalten')
  .regex(/[0-9]/, 'Passwort muss mindestens eine Zahl enthalten')
  .regex(/[^A-Za-z0-9]/, 'Passwort muss mindestens ein Sonderzeichen enthalten');

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100)
});

const eventSchema = z.object({
  title: z.string().min(1, 'Titel ist erforderlich').max(100, 'Titel ist zu lang').transform(sanitizeText),
  description: z.string().max(2000, 'Beschreibung ist zu lang').optional().transform(v => v ? sanitizeText(v) : v),
  date: z.string().min(1, 'Datum ist erforderlich'),
  location: z.string().min(1, 'Ort ist erforderlich').max(200, 'Ort ist zu lang').transform(sanitizeText),
  meeting_point: z.string().max(200, 'Treffpunkt ist zu lang').optional().nullable().transform(v => v ? sanitizeText(v) : v),
  response_deadline: z.string().optional().nullable(),
  type: z.enum(['event', 'wanderung', 'sport', 'demo', 'spontan']).default('event')
});

const personSchema = z.object({
   name: z.string().min(1, 'Name ist erforderlich').max(100).transform(sanitizeText),
   username: z.string().max(50).optional().nullable().transform(v => v ? sanitizeText(v) : v),
   email: z.string().email('Ungültige E-Mail Adresse').max(255).optional().nullable().or(z.literal('')),
   notes: z.string().max(1000).optional().nullable().transform(v => v ? sanitizeText(v) : v),
   avatar_url: z.string().url().optional().nullable()
});

const inviteSchema = z.object({
  person_id: z.number()
});

const bulkInviteSchema = z.object({
  person_ids: z.array(z.number())
});

const respondSchema = z.object({
  status: z.enum(['yes', 'no', 'maybe']),
  comment: z.string().max(500, 'Anmerkung ist zu lang').optional().nullable().transform(v => v ? sanitizeText(v) : v),
  guests_count: z.number().min(0).max(10).optional().default(0)
});

const settingsSchema = z.object({
  username: z.string().min(1, 'Benutzername ist erforderlich').max(50).transform(sanitizeText),
  avatar_url: z.string().url().optional().nullable(),
  currentPassword: z.string().max(100).optional(),
  newPassword: strongPassword.optional()
});

const setupProfileSchema = z.object({
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein').max(50).transform(sanitizeText),
  password: strongPassword
});

const registrationRequestSchema = z.object({
  name: z.string().min(2, 'Name ist zu kurz').max(100).transform(sanitizeText),
  email: z.string().email('Ungültige E-Mail Adresse').max(255).optional().or(z.literal(''))
});

const registerWithCodeSchema = z.object({
  code: z.string().min(1, 'Code ist erforderlich').max(64),
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein').max(50).transform(sanitizeText),
  password: z.string().min(8, 'Passwort muss mindestens 8 Zeichen lang sein').max(100)
});

const invitationStepSchema = z.object({
  name: z.string().min(1).max(100).transform(sanitizeText),
  message: z.string().min(1).max(2000).transform(sanitizeText),
  scheduled_at: z.string().datetime().optional().nullable()
});

const checklistSchema = z.object({
  item_name: z.string().min(1).max(100).transform(sanitizeText),
  notes: z.string().max(500).optional().nullable().transform(v => v ? sanitizeText(v) : v)
});

const pollSchema = z.object({
  question: z.string().min(1).max(200).transform(sanitizeText),
  options: z.array(z.string().min(1).max(100).transform(sanitizeText)).min(2).max(10)
});

const fcmTokenSchema = z.object({
  token: z.string().min(10)
});

const messageSchema = z.object({
  message: z.string().min(1).max(2000).transform(v => sanitizeHtml(v))
});

// --- AUTH ROUTES ---
const authRouter = Router();
authRouter.post('/login', loginLimiter, (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    console.log(`[Login] Attempt for username: ${username}`);
    const user = db.prepare('SELECT * FROM admin_users WHERE username = ?').get(username) as any;

    const genericError = 'Ungültige Anmeldedaten oder Account gesperrt.';

    if (!user) {
      console.warn(`[Login] User not found: ${username}`);
      logAudit('admin', null, 'LOGIN_FAILED', { reason: 'user_not_found', username }, req.ip);
      return res.status(401).json({ error: genericError });
    }

    if (user.locked_until && new Date(user.locked_until) > new Date()) {
      console.warn(`[Login] Account locked for user: ${username}`);
      logAudit('admin', user.id, 'LOGIN_FAILED', { reason: 'account_locked' }, req.ip);
      return res.status(429).json({ error: genericError });
    }

    if (!bcrypt.compareSync(password, user.password_hash)) {
      console.warn(`[Login] Invalid password for user: ${username}`);
      const attempts = (user.failed_login_attempts || 0) + 1;
      if (attempts >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60000).toISOString();
        db.prepare('UPDATE admin_users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, user.id);
        logAudit('admin', user.id, 'LOGIN_FAILED', { reason: 'account_locked_after_attempts' }, req.ip);
        return res.status(429).json({ error: genericError });
      } else {
        db.prepare('UPDATE admin_users SET failed_login_attempts = ? WHERE id = ?').run(attempts, user.id);
        logAudit('admin', user.id, 'LOGIN_FAILED', { reason: 'invalid_password' }, req.ip);
        return res.status(401).json({ error: genericError });
      }
    }

    // Success - Reset counters
    console.log(`[Login] Success for user: ${username}`);
    db.prepare('UPDATE admin_users SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(user.id);

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: isProd ? 'lax' : 'none',
      path: '/',
      priority: 'high'
    });
    loginLimiter.resetKey(req.ip);
    logAudit('admin', user.id, 'LOGIN_SUCCESS', { username }, req.ip);
    res.json({ success: true });
  } catch (e) {
    console.error(`[Login] Error: ${e instanceof Error ? e.message : 'Unknown'}`);
    res.status(400).json({ error: 'Ungültige Eingabedaten' });
  }
});
authRouter.post('/logout', (req, res) => {
  const token = req.cookies.admin_token;
  if (token) {
    try {
      const decoded = jwt.decode(token) as { exp: number };
      const expiresAt = new Date(decoded.exp * 1000).toISOString();
      db.prepare('INSERT INTO token_blacklist (token_hash, expires_at) VALUES (?, ?)').run(hashToken(token), expiresAt);
    } catch (e) {
      // Token invalid, nothing to blacklist
    }
    logAudit('admin', null, 'LOGOUT', {}, req.ip);
  }
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? 'lax' : 'none',
    path: '/'
  });
  res.json({ success: true });
});
authRouter.get('/check', requireAuth, (req: any, res) => {
  console.log(`[AuthCheck] Success for user: ${req.admin.username} (role: ${req.role})`);
  let avatar_url: string | null = null;
  try {
    if (req.role === 'admin') {
      const u = db.prepare('SELECT avatar_url FROM admin_users WHERE id = ?').get(req.admin.id) as any;
      avatar_url = u?.avatar_url || null;
    } else {
      const u = db.prepare('SELECT avatar_url FROM persons WHERE id = ?').get(req.admin.id) as any;
      avatar_url = u?.avatar_url || null;
    }
  } catch (e) {
    // ignore
  }
  res.json({
    user: { id: req.admin.id, username: req.admin.username, role: req.role, avatar_url },
  });
});

authRouter.post('/fcm-token', requireAuth, (req: any, res) => {
  try {
    const { token } = fcmTokenSchema.parse(req.body);
    db.prepare('INSERT OR REPLACE INTO fcm_tokens (user_type, user_id, token) VALUES (?, ?, ?)')
      .run('admin', req.admin.id, token);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Ungültiger Token' });
  }
});

// Invite Code Management (admin-only, for registration links)
authRouter.get('/invites', requireAuth, (req: any, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren.' });
  const invites = db.prepare('SELECT * FROM invites ORDER BY created_at DESC').all();
  res.json(invites);
});

authRouter.post('/invite', requireAuth, (req: any, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren.' });
  try {
    const { role, maxUses } = z.object({
      role: z.enum(['admin', 'member']).default('member'),
      maxUses: z.number().int().min(1).max(100).default(5),
    }).parse(req.body);
    const code = crypto.randomBytes(12).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16).toUpperCase();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const info = db.prepare('INSERT INTO invites (code, role, max_uses, expires_at, created_by) VALUES (?, ?, ?, ?, ?)')
      .run(code, role, maxUses, expiresAt, req.admin.username);
    const invite = db.prepare('SELECT * FROM invites WHERE id = ?').get(info.lastInsertRowid);
    logAudit('admin', req.admin.id, 'INVITE_CREATED', { code, role, maxUses }, req.ip);
    res.json(invite);
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Fehler beim Erstellen' });
  }
});

authRouter.delete('/invite/:id', requireAuth, (req: any, res) => {
  if (req.role !== 'admin') return res.status(403).json({ error: 'Nur für Administratoren.' });
  const result = db.prepare('DELETE FROM invites WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Einladung nicht gefunden' });
  res.json({ success: true });
});

apiRouter.use('/auth', authRouter);

// --- ADMIN ROUTES ---
const adminRouter = Router();
adminRouter.use(requireAuth);

// CSRF protection for state-changing operations
adminRouter.use((req: any, res: any, next: any) => {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const csrfToken = req.headers['x-csrf-token'];
    const origin = req.headers['origin'] || req.headers['referer'];

    if (!origin && !csrfToken) {
      return res.status(403).json({ error: 'CSRF protection: Origin or X-CSRF-Token required' });
    }

    if (isProd && origin && !origin.includes(req.get('host'))) {
      return res.status(403).json({ error: 'CSRF protection: Invalid origin' });
    }
  }
  next();
});

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
adminRouter.put('/events/:id', async (req, res) => {
  try {
    const { title, description, date, location, meeting_point, response_deadline, type } = eventSchema.parse(req.body);
    
    // Get existing event to check for changes
    const existingEvent = db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id) as any;
    if (!existingEvent) return res.status(404).json({ error: 'Event not found' });

    const changes: string[] = [];
    if (existingEvent.title !== title) changes.push(`Titel geändert zu: ${title}`);
    if (existingEvent.date !== date) changes.push(`Datum geändert auf: ${new Date(date).toLocaleString('de-DE')}`);
    if (existingEvent.location !== location) changes.push(`Ort geändert zu: ${location}`);

    const stmt = db.prepare('UPDATE events SET title = ?, description = ?, date = ?, location = ?, meeting_point = ?, response_deadline = ?, type = ? WHERE id = ?');
    stmt.run(title, description || null, date, location, meeting_point || null, response_deadline || null, type, req.params.id);
    
    if (changes.length > 0) {
      await notifyEventUpdate(Number(req.params.id), changes);
    }
    
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});
adminRouter.delete('/events/:id', (req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

adminRouter.post('/broadcast-notification', async (req, res) => {
  try {
    const { title, body } = z.object({
      title: z.string().min(1).max(100).transform(sanitizeText),
      body: z.string().min(1).max(500).transform(sanitizeText)
    }).parse(req.body);

    await sendBroadcastNotification({ title, body });
    
    logAudit('admin', req.admin.id, 'BROADCAST_NOTIFICATION_SENT', { title }, req.ip);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
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
    const { name, message, scheduled_at } = invitationStepSchema.parse(req.body);
    const stmt = db.prepare('INSERT INTO event_invitation_steps (event_id, name, message, scheduled_at) VALUES (?, ?, ?, ?)');
    const info = stmt.run(req.params.id, name, message, scheduled_at || null);
    logAudit('admin', req.admin.id, 'INVITATION_STEP_CREATED', { event_id: req.params.id, step_id: info.lastInsertRowid }, req.ip);
    res.json({ id: info.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Fehler beim Erstellen des Einladungsschritts' });
  }
});

adminRouter.put('/events/:id/invitation-steps/:stepId', (req, res) => {
  try {
    const { name, message, scheduled_at } = invitationStepSchema.parse(req.body);
    const stmt = db.prepare('UPDATE event_invitation_steps SET name = ?, message = ?, scheduled_at = ? WHERE id = ? AND event_id = ?');
    stmt.run(name, message, scheduled_at || null, req.params.stepId, req.params.id);
    logAudit('admin', req.admin.id, 'INVITATION_STEP_UPDATED', { event_id: req.params.id, step_id: req.params.stepId }, req.ip);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Fehler beim Aktualisieren des Einladungsschritts' });
  }
});

adminRouter.delete('/events/:id/invitation-steps/:stepId', (req, res) => {
  db.prepare('DELETE FROM event_invitation_steps WHERE id = ? AND event_id = ?').run(req.params.stepId, req.params.id);
  logAudit('admin', req.admin.id, 'INVITATION_STEP_DELETED', { event_id: req.params.id, step_id: req.params.stepId }, req.ip);
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

    const token = crypto.randomBytes(32).toString('hex');
    const stmt = db.prepare('INSERT INTO invitees (event_id, person_id, name_snapshot, token) VALUES (?, ?, ?, ?)');
    const info = stmt.run(req.params.id, person_id, person.name, token);

    // Create notification for person ONLY if they have a profile
    if (person.password_hash) {
      const event = db.prepare('SELECT title FROM events WHERE id = ?').get(req.params.id) as any;
      db.prepare(`
        INSERT INTO notifications (user_type, user_id, title, message, link)
        VALUES ('person', ?, ?, ?, ?)
      `).run(person_id, 'Neue Einladung', `Du wurdest zu "${event.title}" eingeladen.`, `/invite/${token}`);
      
      // Send Push Notification
      sendPushNotification('person', person_id, {
        title: 'Neue Einladung',
        body: `Du wurdest zu "${event.title}" eingeladen.`,
        data: { eventId: req.params.id, token }
      }).catch(e => console.error('FCM Error:', e));
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
            const token = crypto.randomBytes(32).toString('hex');
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
    if (!['yes', 'no', 'maybe', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Ungültiger Status' });
    }
    db.prepare('UPDATE invitees SET status = ?, responded_at = CURRENT_TIMESTAMP WHERE id = ? AND event_id = ?').run(status, req.params.inviteId, req.params.id);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Aktualisieren des Status' });
  }
});

// Persons (admin-only)
adminRouter.get('/persons', requireFullAdmin, (req, res) => {
  const persons = db.prepare('SELECT id, name, username, email, notes, created_at FROM persons ORDER BY name ASC').all();
  res.json(persons);
});
adminRouter.post('/persons', requireFullAdmin, (req, res) => {
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
adminRouter.put('/persons/:id', requireFullAdmin, (req, res) => {
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
adminRouter.delete('/persons/:id', requireFullAdmin, (req, res) => {
  db.prepare('DELETE FROM persons WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// Stats (admin-only)
adminRouter.get('/stats', requireFullAdmin, (req, res) => {
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

// Registration Requests (admin-only)
adminRouter.get('/registration-requests', requireFullAdmin, (req, res) => {
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
  try {
    const { item_name, notes } = checklistSchema.parse(req.body);
    const info = db.prepare('INSERT INTO checklists (event_id, item_name, notes) VALUES (?, ?, ?)').run(req.params.id, item_name, notes || null);
    logAudit('admin', req.admin.id, 'CHECKLIST_ITEM_CREATED', { event_id: req.params.id, item_id: info.lastInsertRowid }, req.ip);
    res.json({ id: info.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

adminRouter.delete('/events/:id/checklist/:itemId', (req, res) => {
  db.prepare('DELETE FROM checklists WHERE id = ? AND event_id = ?').run(req.params.itemId, req.params.id);
  logAudit('admin', req.admin.id, 'CHECKLIST_ITEM_DELETED', { event_id: req.params.id, item_id: req.params.itemId }, req.ip);
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
  try {
    const { question, options } = pollSchema.parse(req.body);

    const pollInfo = db.prepare('INSERT INTO polls (event_id, question) VALUES (?, ?)').run(req.params.id, question);
    const pollId = pollInfo.lastInsertRowid;
    const insertOpt = db.prepare('INSERT INTO poll_options (poll_id, option_text) VALUES (?, ?)');
    for (const opt of options) {
      insertOpt.run(pollId, opt);
    }
    logAudit('admin', req.admin.id, 'POLL_CREATED', { event_id: req.params.id, poll_id: pollId }, req.ip);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
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
  try {
    const { message } = messageSchema.parse(req.body);
    const info = db.prepare('INSERT INTO event_messages (event_id, is_admin, message) VALUES (?, 1, ?)').run(req.params.id, message);
    logAudit('admin', req.admin.id, 'EVENT_MESSAGE_SENT', { event_id: req.params.id, message_id: info.lastInsertRowid }, req.ip);
    res.json({ id: info.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

adminRouter.delete('/events/:id/messages/:msgId', (req, res) => {
  db.prepare('DELETE FROM event_messages WHERE id = ? AND event_id = ?').run(req.params.msgId, req.params.id);
  logAudit('admin', req.admin.id, 'EVENT_MESSAGE_DELETED', { event_id: req.params.id, message_id: req.params.msgId }, req.ip);
  res.json({ success: true });
});

adminRouter.put('/registration-requests/:id/approve', requireFullAdmin, (req, res) => {
  try {
    const code = crypto.randomBytes(32).toString('hex').toUpperCase();
    const request = db.prepare('SELECT * FROM registration_requests WHERE id = ?').get(req.params.id) as any;

    if (!request) {
      return res.status(404).json({ error: 'Anfrage nicht gefunden' });
    }

    // Create person from the approved request
    const personInfo = db.prepare('INSERT INTO persons (name, username, email) VALUES (?, ?, ?)').run(
      request.name,
      request.username || request.name.toLowerCase().replace(/\s+/g, '.'),
      request.email || null
    );
    const personId = personInfo.lastInsertRowid;

    db.prepare("UPDATE registration_requests SET status = 'approved', code = ?, person_id = ? WHERE id = ?").run(code, personId, req.params.id);

    logAudit('admin', req.admin.id, 'REGISTRATION_APPROVED', { request_id: req.params.id, name: request.name, person_id: personId }, req.ip);
    res.json({ success: true, code, person_id: personId });
  } catch (e: any) {
    res.status(400).json({ error: 'Fehler beim Genehmigen' });
  }
});

adminRouter.put('/registration-requests/:id/reject', requireFullAdmin, (req, res) => {
  db.prepare("UPDATE registration_requests SET status = 'rejected' WHERE id = ?").run(req.params.id);
  res.json({ success: true });
});

adminRouter.delete('/registration-requests/:id', requireFullAdmin, (req, res) => {
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
adminRouter.get('/settings', requireFullAdmin, (req: any, res) => {
  const user = db.prepare('SELECT username, avatar_url FROM admin_users WHERE id = ?').get(req.admin.id) as any;
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json({ username: user.username, avatar_url: user.avatar_url || null });
});

// Admin Management
adminRouter.get('/admins', requireFullAdmin, (req, res) => {
  const admins = db.prepare('SELECT id, username FROM admin_users ORDER BY username ASC').all();
  res.json(admins);
});

adminRouter.post('/admins', requireFullAdmin, (req, res) => {
  try {
    const { username, password } = z.object({
      username: z.string().min(3).max(50).transform(sanitizeText),
      password: strongPassword
    }).parse(req.body);

    const hash = bcrypt.hashSync(password, 14);
    const info = db.prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)').run(username, hash);
    const adminId = info.lastInsertRowid;

    // Create person for the new admin immediately
    const personInfo = db.prepare('INSERT INTO persons (name, notes) VALUES (?, ?)').run(username, 'Admin Account');
    const personId = personInfo.lastInsertRowid;
    db.prepare('UPDATE admin_users SET person_id = ? WHERE id = ?').run(personId, adminId);

    logAudit('admin', req.admin.id, 'ADMIN_CREATED', { new_admin_id: adminId, username }, req.ip);
    res.json({ success: true, id: adminId });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername ist bereits vergeben' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Fehler beim Erstellen des Admins' });
  }
});

adminRouter.delete('/admins/:id', requireFullAdmin, (req, res) => {
  if (Number(req.params.id) === (req as any).admin.id) {
    return res.status(400).json({ error: 'Du kannst dich nicht selbst löschen' });
  }
  db.prepare('DELETE FROM admin_users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

adminRouter.put('/settings', requireFullAdmin, (req: any, res) => {
  try {
    const { username, currentPassword, newPassword } = settingsSchema.parse(req.body);

    const user = db.prepare('SELECT * FROM admin_users WHERE id = ?').get(req.admin.id) as any;
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Aktuelles Passwort wird benötigt' });
      }
      if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
      }

      // Revoke old tokens when password changes
      if (req.adminToken) {
        try {
          const decoded = jwt.decode(req.adminToken) as { exp: number };
          const expiresAt = new Date(decoded.exp * 1000).toISOString();
          db.prepare('INSERT INTO token_blacklist (token_hash, expires_at) VALUES (?, ?)').run(hashToken(req.adminToken), expiresAt);
        } catch (e) {}
      }

      const newHash = bcrypt.hashSync(newPassword, 14);
      db.prepare('UPDATE admin_users SET username = ?, password_hash = ? WHERE id = ?')
        .run(username, newHash, req.admin.id);
      logAudit('admin', req.admin.id, 'PASSWORD_CHANGED', { username }, req.ip);
    } else {
      db.prepare('UPDATE admin_users SET username = ? WHERE id = ?')
        .run(username, req.admin.id);
    }

    // Keep persons table in sync if username changed
    if (username !== user.username && user.person_id) {
      db.prepare('UPDATE persons SET name = ? WHERE id = ?').run(username, user.person_id);
    }

    logAudit('admin', req.admin.id, 'SETTINGS_UPDATED', { username }, req.ip);
    const token = jwt.sign({ id: req.admin.id, username: username }, JWT_SECRET, { expiresIn: '1d' });
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: isProd ? 'lax' : 'none',
      path: '/',
      priority: 'high'
    });
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername ist bereits vergeben' });
    }
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

apiRouter.use('/admin', adminRouter);

// --- PUBLIC ROUTES ---
const publicRouter = Router();

publicRouter.get('/profile', requirePersonAuth, (req: any, res) => {
  const user = db.prepare('SELECT username, name, avatar_url, email, created_at FROM persons WHERE id = ?').get(req.person.id) as any;
  if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });
  res.json({ username: user.username, name: user.name, avatar_url: user.avatar_url, email: user.email, created_at: user.created_at });
});

const memberProfileSchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich').max(100).transform(sanitizeText),
  username: z.string().min(3, 'Benutzername muss mindestens 3 Zeichen lang sein').max(50).transform(sanitizeText),
  email: z.string().email('Ungültige E-Mail-Adresse').max(255).optional().nullable().or(z.literal('')),
  avatar_url: z.union([
    z.string().url(),
    z.string().regex(/^data:image\/(jpeg|png|gif|webp);base64,/, 'Ungültiges Bildformat').max(500_000, 'Bild ist zu groß')
  ]).optional().nullable(),
  currentPassword: z.string().max(100).optional(),
  newPassword: strongPassword.optional(),
  confirmPassword: z.string().optional()
}).refine(data => !data.newPassword || data.newPassword === data.confirmPassword, {
  message: 'Passwörter stimmen nicht überein',
  path: ['confirmPassword']
});

publicRouter.put('/profile', requirePersonAuth, (req: any, res) => {
  try {
    const parsed = memberProfileSchema.parse(req.body);
    const { name, username, email, avatar_url, currentPassword, newPassword } = parsed;

    const user = db.prepare('SELECT * FROM persons WHERE id = ?').get(req.person.id) as any;
    if (!user) return res.status(404).json({ error: 'Benutzer nicht gefunden' });

    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Aktuelles Passwort wird benötigt' });
      }
      if (!user.password_hash || !bcrypt.compareSync(currentPassword, user.password_hash)) {
        return res.status(401).json({ error: 'Aktuelles Passwort ist falsch' });
      }

      if (req.personToken) {
        try {
          const decoded = jwt.decode(req.personToken) as { exp: number };
          const expiresAt = new Date(decoded.exp * 1000).toISOString();
          db.prepare('INSERT INTO token_blacklist (token_hash, expires_at) VALUES (?, ?)').run(hashToken(req.personToken), expiresAt);
        } catch (e) {}
      }

      const newHash = bcrypt.hashSync(newPassword, 12);
      db.prepare('UPDATE persons SET username = ?, name = ?, email = ?, avatar_url = ?, password_hash = ? WHERE id = ?')
        .run(username, name, email || null, avatar_url ?? null, newHash, req.person.id);
      logAudit('person', req.person.id, 'PASSWORD_CHANGED', { username }, req.ip);
    } else {
      db.prepare('UPDATE persons SET username = ?, name = ?, email = ?, avatar_url = ? WHERE id = ?')
        .run(username, name, email || null, avatar_url ?? null, req.person.id);
    }

    logAudit('person', req.person.id, 'PROFILE_UPDATED', { username }, req.ip);
    res.json({ success: true });
  } catch (e: any) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(400).json({ error: 'Benutzername bereits vergeben' });
    }
    if (e.errors) {
      return res.status(400).json({ error: e.errors[0]?.message || 'Ungültige Daten' });
    }
    res.status(400).json({ error: 'Ungültige Daten' });
  }
});

publicRouter.post('/registration-request', registrationRequestLimiter, (req, res) => {
  try {
    // Honeypot field - if filled, it's a bot
    if (req.body.website) {
      // Silently accept but don't process (honeypot)
      return res.json({ success: true });
    }

    const { name, email } = registrationRequestSchema.parse(req.body);
    db.prepare("INSERT INTO registration_requests (name, email) VALUES (?, ?)").run(name, email || null);

    // Notify admin
    db.prepare(`
      INSERT INTO notifications (user_type, title, message, link)
      VALUES ('admin', 'Neue Registrierungsanfrage', ?, '/registration-requests')
    `).run(`${name} möchte Mitglied werden.`);

    logAudit(null, null, 'REGISTRATION_REQUEST', { name, email }, req.ip);
    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

publicRouter.post('/register', (req, res) => {
  try {
    const { code, username, password } = registerWithCodeSchema.parse(req.body);
    
    const request = db.prepare("SELECT * FROM registration_requests WHERE code = ? AND status = 'approved'").get(code) as any;
    if (!request) {
      return res.status(400).json({ error: 'Ungültiger oder nicht genehmigter Registrierungscode' });
    }

    const hash = bcrypt.hashSync(password, 14);
    
    const personId = db.transaction(() => {
      // Check if person was already auto-created during approval (person_id set but no password)
      if (request.person_id) {
        const existing = db.prepare('SELECT id, password_hash FROM persons WHERE id = ?').get(request.person_id) as any;
        if (existing && !existing.password_hash) {
          // Update existing person with password and username
          db.prepare('UPDATE persons SET username = ?, password_hash = ?, name = COALESCE(name, ?) WHERE id = ?')
            .run(username, hash, request.name, existing.id);
          db.prepare('DELETE FROM registration_requests WHERE id = ?').run(request.id);
          // Notify admin
          db.prepare(`INSERT INTO notifications (user_type, title, message, link) VALUES ('admin', 'Neues Mitglied registriert', ?, '/persons')`)
            .run(request.name + ' (@' + username + ') hat sein Profil vervollständigt.');
          return existing.id;
        }
      }
      
      // Create new person
      const info = db.prepare('INSERT INTO persons (name, username, email, password_hash) VALUES (?, ?, ?, ?)')
        .run(request.name, username, request.email, hash);
      const newId = info.lastInsertRowid;
      
      db.prepare('DELETE FROM registration_requests WHERE id = ?').run(request.id);
      db.prepare(`INSERT INTO notifications (user_type, title, message, link) VALUES ('admin', 'Neues Mitglied registriert', ?, '/persons')`)
        .run(request.name + ' (@' + username + ') hat sich erfolgreich registriert.');
      return newId;
    })();

    const token = jwt.sign({ id: personId, name: request.name, type: 'person' }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('person_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: isProd ? 'lax' : 'none',
      path: '/',
      priority: 'high'
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
    const person = db.prepare('SELECT * FROM persons WHERE username = ? OR name = ?').get(username, username) as any;

    const genericError = 'Ungültige Anmeldedaten oder Account gesperrt.';

    if (!person || !person.password_hash) {
      logAudit('person', null, 'LOGIN_FAILED', { reason: 'user_not_found_or_no_password', username }, req.ip);
      return res.status(401).json({ error: genericError });
    }

    if (person.locked_until && new Date(person.locked_until) > new Date()) {
      logAudit('person', person.id, 'LOGIN_FAILED', { reason: 'account_locked' }, req.ip);
      return res.status(429).json({ error: genericError });
    }

    if (!bcrypt.compareSync(password, person.password_hash)) {
      const attempts = (person.failed_login_attempts || 0) + 1;
      if (attempts >= 5) {
        const lockedUntil = new Date(Date.now() + 30 * 60000).toISOString();
        db.prepare('UPDATE persons SET failed_login_attempts = ?, locked_until = ? WHERE id = ?').run(attempts, lockedUntil, person.id);
        logAudit('person', person.id, 'LOGIN_FAILED', { reason: 'account_locked_after_attempts' }, req.ip);
        return res.status(429).json({ error: genericError });
      } else {
        db.prepare('UPDATE persons SET failed_login_attempts = ? WHERE id = ?').run(attempts, person.id);
        logAudit('person', person.id, 'LOGIN_FAILED', { reason: 'invalid_password' }, req.ip);
        return res.status(401).json({ error: genericError });
      }
    }

    // Success - Reset counters
    db.prepare('UPDATE persons SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?').run(person.id);

    const token = jwt.sign({ id: person.id, name: person.name, type: 'person' }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('person_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: isProd ? 'lax' : 'none',
      path: '/',
      priority: 'high'
    });
    loginLimiter.resetKey(req.ip);
    logAudit('person', person.id, 'LOGIN_SUCCESS', { username }, req.ip);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Ungültige Eingabedaten' });
  }
});

publicRouter.post('/logout', (req, res) => {
  const token = req.cookies.person_token;
  if (token) {
    try {
      const decoded = jwt.decode(token) as { exp: number };
      const expiresAt = new Date(decoded.exp * 1000).toISOString();
      db.prepare('INSERT INTO token_blacklist (token_hash, expires_at) VALUES (?, ?)').run(hashToken(token), expiresAt);
    } catch (e) {
      // Token invalid, nothing to blacklist
    }
    logAudit('person', null, 'LOGOUT', {}, req.ip);
  }
  res.clearCookie('person_token', {
    httpOnly: true,
    secure: true,
    sameSite: isProd ? 'lax' : 'none',
    path: '/'
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

  // Get other participants
  const participants = db.prepare(`
    SELECT p.name, i.status, i.guests_count
    FROM invitees i
    JOIN persons p ON i.person_id = p.id
    WHERE i.event_id = ? AND i.id != ? AND i.status IS NOT NULL AND i.status != 'pending'
    ORDER BY 
      CASE i.status 
        WHEN 'yes' THEN 1 
        WHEN 'maybe' THEN 2 
        WHEN 'no' THEN 3 
        ELSE 4 
      END,
      p.name ASC
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
  try {
    const { message } = messageSchema.parse(req.body);
    const invitee = db.prepare('SELECT event_id, person_id FROM invitees WHERE token = ?').get(req.params.token) as any;
    if (!invitee) return res.status(404).json({ error: 'Einladung nicht gefunden' });

    const info = db.prepare('INSERT INTO event_messages (event_id, person_id, message) VALUES (?, ?, ?)').run(invitee.event_id, invitee.person_id, message);
    logAudit('person', invitee.person_id, 'EVENT_MESSAGE_SENT', { event_id: invitee.event_id, message_id: info.lastInsertRowid }, req.ip);
    
    // Send Push Notification asynchronously
    notifyNewMessage(invitee.event_id, invitee.person_id, message).catch(e => console.error('FCM Error:', e));
    
    res.json({ id: info.lastInsertRowid });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
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

    const hash = bcrypt.hashSync(password, 14);
    db.prepare('UPDATE persons SET username = ?, password_hash = ? WHERE id = ?').run(username, hash, invitee.person_id);

    // Auto login after setup
    const token = jwt.sign({ id: person.id, name: person.name, type: 'person' }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('person_token', token, {
      httpOnly: true,
      secure: true,
      sameSite: isProd ? 'lax' : 'none',
      path: '/',
      priority: 'high'
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

publicRouter.post('/fcm-token', requirePersonAuth, (req: any, res) => {
  try {
    const { token } = fcmTokenSchema.parse(req.body);
    db.prepare('INSERT OR REPLACE INTO fcm_tokens (user_type, user_id, token) VALUES (?, ?, ?)')
      .run('person', req.person.id, token);
    res.json({ success: true });
  } catch (e) {
    res.status(400).json({ error: 'Ungültiger Token' });
  }
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
      db.prepare(`
        INSERT INTO notifications (user_type, title, message, link)
        VALUES ('admin', ?, ?, ?)
      `).run(
        'Neue Antwort',
        `${inviteeDetails.name_snapshot} hat für "${inviteeDetails.title}" ${statusText}.`,
        `/events/${inviteeDetails.event_id}`
      );
    }

    res.json({ success: true });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

// --- PINNWAND / BOARD ROUTES (all authenticated users) ---
const boardPostSchema = z.object({
  type: z.enum(['info', 'poll']),
  title: z.string().min(1).max(200).transform(sanitizeText),
  content: z.string().max(2000).transform(sanitizeText).optional(),
  options: z.array(z.string().min(1).max(200).transform(sanitizeText)).min(2).max(10).optional(),
});

function getBoardPersonId(req: any): number | null {
  if (req.role === 'member') return req.person?.id ?? null;
  const row = db.prepare('SELECT person_id FROM admin_users WHERE id = ?').get(req.admin?.id) as any;
  return row?.person_id ?? null;
}

apiRouter.get('/board/posts', requireAuth, (req: any, res) => {
  const myPersonId = getBoardPersonId(req);
  const posts = db.prepare(`
    SELECT p.id, p.type, p.title, p.content, p.author_person_id, p.author_name, p.created_at
    FROM board_posts p
    ORDER BY p.created_at DESC
  `).all() as any[];

  const isAdmin = req.role === 'admin';
  const result = posts.map(post => {
    if (post.type === 'poll') {
      const options = db.prepare(`
        SELECT o.id, o.label,
          COUNT(v.id) as vote_count,
          MAX(CASE WHEN v.person_id = ? THEN 1 ELSE 0 END) as i_voted
        FROM board_poll_options o
        LEFT JOIN board_poll_votes v ON v.option_id = o.id
        WHERE o.post_id = ?
        GROUP BY o.id
      `).all(myPersonId ?? -1, post.id) as any[];
      // For admins: include voter names
      if (isAdmin) {
        const optionsWithVoters = options.map((opt: any) => {
          const voters = db.prepare(`
            SELECT p.id, p.name FROM board_poll_votes v
            JOIN persons p ON v.person_id = p.id
            WHERE v.option_id = ?
            ORDER BY p.name ASC
          `).all(opt.id) as { id: number; name: string }[];
          return { ...opt, voters };
        });
        return { ...post, options: optionsWithVoters };
      }
      return { ...post, options };
    }
    return post;
  });

  res.json(result);
});

apiRouter.post('/board/posts', requireAuth, (req: any, res) => {
  try {
    const { type, title, content, options } = boardPostSchema.parse(req.body);
    const personId = getBoardPersonId(req);
    const authorName = req.admin?.username ?? 'Unbekannt';

    const info = db.prepare(
      'INSERT INTO board_posts (type, title, content, author_person_id, author_name) VALUES (?, ?, ?, ?, ?)'
    ).run(type, title, content ?? null, personId, authorName);

    const postId = info.lastInsertRowid;

    if (type === 'poll' && options) {
      const insertOpt = db.prepare('INSERT INTO board_poll_options (post_id, label) VALUES (?, ?)');
      for (const label of options) insertOpt.run(postId, label);
    }

    // Notify all members with profiles about the new board post
    const members = db.prepare('SELECT id FROM persons WHERE password_hash IS NOT NULL').all() as { id: number }[];
    const notifTitle = type === 'poll' ? `Neue Umfrage: ${title}` : `Neuer Beitrag: ${title}`;
    const notifMessage = `${authorName} hat ${type === 'poll' ? 'eine Umfrage' : 'einen Beitrag'} auf der Pinnwand gepostet.`;
    const insertNotif = db.prepare(
      'INSERT INTO notifications (user_type, user_id, title, message, link) VALUES (\'person\', ?, ?, ?, \'/pinnwand\')'
    );
    for (const member of members) {
      insertNotif.run(member.id, notifTitle, notifMessage);
    }

    // Also notify admins
    const admins = db.prepare('SELECT id FROM admin_users').all() as { id: number }[];
    const adminNotif = db.prepare(
      'INSERT INTO notifications (user_type, user_id, title, message, link) VALUES (\'admin\', ?, ?, ?, \'/pinnwand\')'
    );
    for (const admin of admins) {
      adminNotif.run(admin.id, notifTitle, notifMessage);
    }

    res.json({ id: postId });
  } catch (e: any) {
    res.status(400).json({ error: e.errors?.[0]?.message || 'Ungültige Eingabedaten' });
  }
});

apiRouter.post('/board/posts/:id/vote', requireAuth, (req: any, res) => {
  const personId = getBoardPersonId(req);
  if (!personId) return res.status(403).json({ error: 'Kein Profil verknüpft' });

  const { optionId } = z.object({ optionId: z.number().int() }).parse(req.body);

  const option = db.prepare('SELECT post_id FROM board_poll_options WHERE id = ?').get(optionId) as any;
  if (!option || String(option.post_id) !== req.params.id)
    return res.status(404).json({ error: 'Option nicht gefunden' });

  // Remove all previous votes for this post by this person, then insert new
  const allOptions = db.prepare('SELECT id FROM board_poll_options WHERE post_id = ?').all(req.params.id) as any[];
  const optionIds = allOptions.map((o: any) => o.id);
  if (optionIds.length) {
    db.prepare(`DELETE FROM board_poll_votes WHERE person_id = ? AND option_id IN (${optionIds.map(() => '?').join(',')})`).run(personId, ...optionIds);
  }
  try {
    db.prepare('INSERT INTO board_poll_votes (option_id, person_id) VALUES (?, ?)').run(optionId, personId);
  } catch (_) {}

  res.json({ success: true });
});

apiRouter.delete('/board/posts/:id/vote', requireAuth, (req: any, res) => {
  const personId = getBoardPersonId(req);
  if (!personId) return res.status(403).json({ error: 'Kein Profil verknüpft' });

  // Remove all votes by this person for the post
  const allOptions = db.prepare('SELECT id FROM board_poll_options WHERE post_id = ?').all(req.params.id) as any[];
  const optionIds = allOptions.map((o: any) => o.id);
  if (optionIds.length) {
    db.prepare(`DELETE FROM board_poll_votes WHERE person_id = ? AND option_id IN (${optionIds.map(() => '?').join(',')})`).run(personId, ...optionIds);
  }
  res.json({ success: true });
});

apiRouter.delete('/board/posts/:id', requireAuth, (req: any, res) => {
  const isAdmin = req.role === 'admin';
  if (!isAdmin)
    return res.status(403).json({ error: 'Keine Berechtigung – nur Admins' });

  const post = db.prepare('SELECT id FROM board_posts WHERE id = ?').get(req.params.id) as any;
  if (!post) return res.status(404).json({ error: 'Beitrag nicht gefunden' });

  db.prepare('DELETE FROM board_posts WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// --- CALENDAR ROUTES ---
const calendarRouter = Router();
calendarRouter.get('/events', requirePersonAuth, (req: any, res) => {
  const events = db.prepare(`
    SELECT e.id, e.title, e.date, e.location, e.type, e.description,
      (SELECT COUNT(*) FROM invitees i WHERE i.event_id = e.id) as participant_count
    FROM events e
    WHERE e.is_archived = 0 OR e.date >= date('now', '-30 days')
    ORDER BY e.date ASC
  `).all();
  res.json(events);
});
apiRouter.use('/calendar', calendarRouter);

apiRouter.use('/public', publicRouter);
