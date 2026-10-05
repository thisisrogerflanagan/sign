import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  release: process.env.VERCEL_GIT_COMMIT_SHA || 'development',
  environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
  beforeSend(event) {
    if (event.request?.url) {
      event.request.url = event.request.url.replace(/\/sign\/[a-zA-Z0-9_-]+/g, '/sign/[REDACTED]');
      event.request.url = event.request.url.replace(/token=[a-zA-Z0-9_-]+/g, 'token=[REDACTED]');
    }

    if (event.request?.url?.includes('/api/sign/')) {
      if (event.request.data) {
        event.request.data = '[REDACTED_FOR_PRIVACY]';
      }
    }

    return event;
  },
});
