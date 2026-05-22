import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { db } from '../db/index.ts';

export const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET (or SESSION_SECRET) is not set in environment variables.');
  process.exit(1);
}

export const isProd = process.env.NODE_ENV === 'production';

// General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per `window`
  message: { error: 'Zu viele Anfragen. Bitte später erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
});

export const requireAuth = (req: any, res: any, next: any) => {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; username: string };
    req.admin = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

export const requirePersonAuth = (req: any, res: any, next: any) => {
  const personToken = req.cookies.person_token;
  const adminToken = req.cookies.admin_token;

  if (personToken) {
    try {
      const decoded = jwt.verify(personToken, JWT_SECRET) as { id: number; name: string; type: string };
      if (decoded.type !== 'person') throw new Error('Not a person token');
      req.person = decoded;
      return next();
    } catch (err) {
      // fall through
    }
  }

  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET) as { id: number; username: string };
      const admin = db.prepare('SELECT person_id FROM admin_users WHERE id = ?').get(decoded.id) as { person_id: number } | undefined;
      if (admin?.person_id) {
        req.person = { id: admin.person_id, name: decoded.username, type: 'person' };
        return next();
      }
    } catch (err) {
      // fall through
    }
  }

  res.status(401).json({ error: 'Unauthorized' });
};

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login requests per `window`
  message: { error: 'Zu viele Login-Versuche. Bitte in 15 Minuten erneut versuchen.' },
  standardHeaders: true,
  legacyHeaders: false,
  validate: false
});
