import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { db } from './src/db/index.ts';
import { apiRouter } from './src/api/index.ts';
import { checkAndSendDeadlineReminders } from './src/services/reminderService.ts';

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 8080;

  app.set('trust proxy', 1);

  // Security headers - Modified for AI Studio iframe compatibility
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Eval often needed for Vite/HMR
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org", "https://*.openstreetmap.org", "https://picsum.photos", "https://lh3.googleusercontent.com"],
        connectSrc: ["'self'", "https://*.sentry.io", "wss:", "ws:", "https://nominatim.openstreetmap.org", "https://*.googleapis.com", "https://fcmregistrations.googleapis.com", "https://*.firebaseio.com", "https://fcm.googleapis.com", "https://api.open-meteo.com", "https://geocoding-api.open-meteo.com"], // Allow WebSockets for Vite and map/Firebase
        fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        frameSrc: ["'self'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'", "*"], // Allow iframe embedding
        upgradeInsecureRequests: []
      }
    },
    crossOriginEmbedderPolicy: false,
    frameguard: false, // Allow iframe embedding
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
  }));

  // Separate middleware for Permissions-Policy
  app.use((req, res, next) => {
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    next();
  });

  app.disable('x-powered-by');

  app.use(express.json({ limit: '2mb' })); // 2 MB to accommodate base64 avatar uploads
  app.use(cookieParser());

  // API Routes
  app.use('/api', apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: { server: undefined as any },
        allowedHosts: true as any,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    // Serve hashed assets with immutable caching (content-hash in filename)
    // Force download for APK files (must come before static middleware)
    app.get('*.apk', (req, res, next) => {
      const filePath = path.join(distPath, req.path);
      if (!fs.existsSync(filePath)) return next();
      res.setHeader('Content-Disposition', 'attachment; filename="' + path.basename(req.path) + '"');
      res.setHeader('Content-Type', 'application/vnd.android.package-archive');
      res.sendFile(filePath);
    });
    app.use('/assets', express.static(path.join(distPath, 'assets'), {
      maxAge: '365d',
      immutable: true,
      setHeaders: (res) => {
        res.setHeader('cache-control', 'public, max-age=31536000, immutable');
      },
    }));
    app.use(express.static(distPath, { etag: true, lastModified: true }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  console.log(`Attempting to listen on port ${PORT}...`);
  // Global timeout — 90s für alle Requests (Default Caddy-Timeout-Reserve)
  app.use((req, res, next) => {
    res.setTimeout(90000, () => {
      console.warn('[Timeout] Request abgebrochen:', req.method, req.originalUrl);
      if (!res.headersSent) {
        res.status(504).json({ error: 'Zeitüberschreitung' });
      }
    });
    next();
  });

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);

    // Deadline reminder scheduler — runs every 15 minutes
    const INTERVAL_MS = 15 * 60 * 1000;
    const runReminders = () => {
      checkAndSendDeadlineReminders().catch(err =>
        console.error('[Reminder] Fehler beim Prüfen der Fristen:', err)
      );
    };
    runReminders(); // run once on startup to catch any missed windows
    setInterval(runReminders, INTERVAL_MS);
    console.log('[Reminder] Frist-Erinnerungen aktiv (alle 15 min).');
  });
}

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});