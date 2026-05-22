import * as Sentry from '@sentry/react';

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;

export function initSentry() {
  const isValidDsn = SENTRY_DSN && SENTRY_DSN.startsWith('http') && SENTRY_DSN.includes('@');

  if (!isValidDsn) {
    if (SENTRY_DSN) {
      console.warn(`[Sentry] Invalid DSN detected: "${SENTRY_DSN}". Sentry will not be initialized.`);
    } else {
      console.warn('[Sentry] DSN not configured. Set VITE_SENTRY_DSN in .env');
    }
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
      Sentry.captureConsoleIntegration({
        levels: ['error', 'warn'],
      }),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event, hint) {
      // Filter out specific errors you don't want to track
      const error = hint.originalException as Error;
      if (error?.message?.includes('Network request failed')) {
        return null;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      // Filter out specific breadcrumbs
      if (breadcrumb.category === 'console' && breadcrumb.level === 'info') {
        return null;
      }
      return breadcrumb;
    },
  });
}

export function setSentryUser(userId: string, email?: string) {
  Sentry.setUser({
    id: userId,
    email,
  });
}

export function clearSentryUser() {
  Sentry.setUser(null);
}

export function captureSentryException(error: Error, context?: Record<string, any>) {
  if (context) {
    Sentry.setContext('custom', context);
  }
  Sentry.captureException(error);
}

export function captureSentryMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export default Sentry;
