import { Application } from 'express';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

import { SENTRY_DSN } from './env';

export function initSentry(app: Application) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      new Sentry.Integrations.Http({
        tracing: true,
      }),
      new Tracing.Integrations.Express({
        app,
      }),
    ],
    tracesSampleRate: 1.0,
  });
}
