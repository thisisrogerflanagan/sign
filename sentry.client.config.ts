import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  beforeSend(event) {
    // Redact tokens in URL
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/\/sign\/[a-zA-Z0-9_-]+/g, '/sign/[REDACTED]');
      event.request.url = event.request.url.replace(/token=[a-zA-Z0-9_-]+/g, 'token=[REDACTED]');
    }

    // Strip bodies from /api/sign/ requests
    if (event.request?.url?.includes('/api/sign/')) {
      if (event.request.data) {
        event.request.data = '[REDACTED_FOR_PRIVACY]';
      }
    }

    // Never attach raw PDF bytes or data URLs
    if (event.extra) {
      for (const k of Object.keys(event.extra)) {
        if (typeof event.extra[k] === 'string' && event.extra[k].startsWith('data:image/')) {
          event.extra[k] = '[BASE64_IMAGE_REDACTED]';
        }
      }
    }

    return event;
  },
});
