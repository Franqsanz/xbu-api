import express, { ErrorRequestHandler, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from 'dotenv';
import helmet from 'helmet';
import logger from 'morgan';
import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import cookieSession from 'cookie-session';
import passport from 'passport';

import db from "./db";
import books from './routes/books';
import auth from './routes/auth';
// import isLoggedIn from './middleware/isLoggedIn';
import './auth/passport';
// import { Cors } from './types';

const app = express();
const PORT = process.env.PORT || 9090;

config();
db();

Sentry.init({
  dsn: process.env.SENTRY_DNS,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});

const allowedOrigins = ['https://xbu.netlify.app', 'https://xbu.vercel.app', 'http://localhost:1010'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: 'GET, POST, PUT, DELETE',
  // credential: true,
};

app.use(cookieSession({
  name: 'session',
  keys: ['secretkeys'],
  maxAge: 24 * 60 * 60 * 1000
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));
app.use(compression());
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(logger('dev'));
app.use(
  helmet(
    {
      contentSecurityPolicy: true,
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: true,
      dnsPrefetchControl: true,
      expectCt: true,
      frameguard: true,
      hidePoweredBy: true,
      hsts: true,
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: true,
      referrerPolicy: true,
      xssFilter: true,
    }
  )
);

app.use((req, res, next) => {
  res.header('Set-Cookie', `SameSite=None; Secure`);
  next();
});

app.get('/', (req: Request, res: Response) => {
  res.send(`
    <section>
      <h1>API REST de XBU</h1>
      <h2>
        Todos los Libros:
        <a href="https://xb-api.vercel.app/api">
          https://xb-api.vercel.app/api
        </a>
      </h2>
    </section>
  `);
});

// app.get('/error', (req, res) => {
//   res.json({ error: { message: 'No tiene autorización' } });
// });

app.use('/api', books);
app.use('/auth', auth);

app.use(Sentry.Handlers.errorHandler());
app.use(function onError(err: ErrorRequestHandler, req: Request, res: any, next: NextFunction) {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});
app.all('*', (req, res: Response) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => console.log('Server Ready'));

export default app;
