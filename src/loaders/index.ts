import express, {
  Application,
  ErrorRequestHandler,
  Request,
  Response,
  NextFunction,
} from 'express';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import logger from 'morgan';
import * as Sentry from '@sentry/node';
import swaggerUi from 'swagger-ui-express';

import { ALLOWED_ORIGIN } from '../config/env';
// import { apiKey } from '../api/middlewares/apiKey';
import { errorHandler } from '../api/middlewares/errorHandler';
import limiter from '../api/middlewares/rateLimit';
import books from '../api/routes/books';
import auth from '../api/routes/auth';
import users from '../api/routes/users';
import swaggerDocument from '../docs/swagger.json';

export function registerMW(app: Application) {
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
    res.header({
      'Set-Cookie': 'SameSite=None; Secure',
      // 'Cache-Control': 'public, max-age=100'
    });

    next();
  });
}

export function registerRoutes(app: Application) {
  app.get('/', (req: Request, res: Response) => {
    const isProduction = process.env.NODE_ENV === 'production';

    res.status(200).send(`
      <section style="margin-top: 30px;">
        <h1 style="font-size: 32px; padding-left: 22px;">API REST de XBuniverse</h1>
        <ul>
          <li>
            <h2 style="font-weight: 500;">
              Datos (JSON):
              <a href="${req.protocol}://${req.hostname}/api">
                ${req.protocol}://${req.hostname}/api
              </a>
            </h2>
          </li>
          ${
            !isProduction
              ? `
            <li>
              <h2 style="font-weight: 500;">
                Documentación (Swagger):
                <a href="${req.protocol}://${req.hostname}/api-docs">
                  ${req.protocol}://${req.hostname}/api-docs
                </a>
              </h2>
            </li>`
              : ''
          }
        </ul>
      </section>
    `);
  });
  app.use('/api', books);
  app.use('/api/auth', auth);
  app.use('/api/users', users);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  app.all('*', (req, res: Response) =>
    res.status(404).json({
      error: 'Not found',
    })
  );

  app.use(errorHandler);
  app.use(Sentry.Handlers.errorHandler());
  app.use(function onError(err: ErrorRequestHandler, req: Request, res: any, next: NextFunction) {
    res.statusCode = 500;
    res.end(res.sentry + '\n');
  });
}
