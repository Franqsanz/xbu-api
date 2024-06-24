import express, { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import logger from 'morgan';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import swaggerUi from 'swagger-ui-express';

import { PORT, SENTRY_DSN, ALLOWED_ORIGIN } from './config/env';
import swaggerDocument from './docs/swagger.json';
import connectDB from './db/connection';
import limiter from './app/middlewares/rateLimit';
// import { apiKey } from './app/middlewares/apiKey';
import books from './app/routes/books';
import auth from './app/routes/auth';
import users from './app/routes/users';

connectDB(); // Ejecutar conexión a la base de datos.

const app = express();

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

// app.use(apiKey);
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(
  express.json({
    limit: '50mb',
  })
);
app.use(
  express.urlencoded({
    limit: '50mb',
    extended: true,
    parameterLimit: 50000,
  })
);
app.use(compression());
app.use(cookieParser());
app.use(limiter);
app.use(logger('dev'));
app.use(
  cors({
    origin: ALLOWED_ORIGIN || '',
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['X-Requested-With', 'Authorization', 'Content-Type', 'Accept', 'Origin'],
    credentials: true,
  })
);
app.use(
  helmet({
    contentSecurityPolicy: true,
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: true,
    dnsPrefetchControl: true,
    frameguard: true,
    hidePoweredBy: true,
    hsts: true,
    ieNoOpen: true,
    noSniff: true,
    originAgentCluster: true,
    permittedCrossDomainPolicies: true,
    referrerPolicy: true,
    xssFilter: true,
  })
);

app.use((req, res, next) => {
  res.header('Set-Cookie', `SameSite=None; Secure`);
  next();
});

app.get('/', (req: Request, res: Response) => {
  const isProduction = process.env.NODE_ENV === 'production';

  res.status(200).send(`
    <section style="margin-top: 30px;">
      <h1 style="font-size: 32px; padding-left: 22px;">API REST de XBuniverse</h1>
      <ul>
        <li>
          <h2 style="font-weight: 500;">
            Datos (JSON):
            <a href="${req.protocol}://${req.get('host')}/api">
              ${req.protocol}://${req.get('host')}/api
            </a>
          </h2>
        </li>
        ${!isProduction ? `
        <li>
          <h2 style="font-weight: 500;">
            Documentación (Swagger):
            <a href="${req.protocol}://${req.get('host')}/api-docs">
              ${req.protocol}://${req.get('host')}/api-docs
            </a>
          </h2>
        </li>` : ''}
      </ul>
    </section>
  `);
});

app.use('/api', books);
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(Sentry.Handlers.errorHandler());
app.use(function onError(err: ErrorRequestHandler, req: Request, res: any, next: NextFunction) {
  res.statusCode = 500;
  res.end(res.sentry + '\n');
});
app.all('*', (req, res: Response) =>
  res.status(404).json({
    error: 'Not found',
  })
);

app.listen(PORT, () => console.log('Server Ready'));

export default app;
