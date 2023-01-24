import express, { ErrorRequestHandler, Request, Response, NextFunction } from "express";
import cors from 'cors';
import compression from 'compression';
import { config } from 'dotenv';
import helmet from 'helmet';
import logger from 'morgan';
import * as Sentry from "@sentry/node";
import * as Tracing from "@sentry/tracing";
// import cookieSession from "cookie-session";
// import passport from "passport";

import db from "./db";
import books from './routes/books';

const app = express();
const PORT = process.env.PORT || 9090;

config();
db();

Sentry.init({
  dsn: "https://7838fe347d5842f6900daa6a822df8f0@o4504136634269696.ingest.sentry.io/4504136636170240",
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0,
});

const allowedOrigins = ['https://xbu.netlify.app', 'http://localhost:1010'];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  }
};

app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.tracingHandler());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(compression());
app.use(cors(corsOptions));
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

app.get('/', (req, res) => {
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
app.use('/api', books);
app.use(Sentry.Handlers.errorHandler());
app.use(function onError(err: ErrorRequestHandler, req: Request, res: any, next: NextFunction) {
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

// app.use(cookieSession({
//   name: 'session',
//   keys: [/* secret keys */],

//   // Cookie Options
//   maxAge: 24 * 60 * 60 * 1000 // 24 hours
// }))
// app.use(passport.initialize());

app.listen(PORT, () => console.log('Server Ready'));

export default app;
