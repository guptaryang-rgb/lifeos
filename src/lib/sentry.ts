// Sentry Error Monitoring Configuration
// To enable: npm install @sentry/nextjs
// Then uncomment and configure in next.config.mjs

export function initSentry() {
  if (typeof window === 'undefined') return; // Server-side: skip for now
  
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!SENTRY_DSN) {
    console.log('[Sentry] No DSN configured. Error monitoring disabled.');
    return;
  }
  
  // Dynamic import to avoid bundling if not used
  import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
    });
    console.log('[Sentry] Error monitoring initialized.');
  }).catch(() => {
    console.log('[Sentry] @sentry/nextjs not installed. Skipping.');
  });
}
