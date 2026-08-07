import express, { Express } from 'express';

import { registerMW, registerRoutes } from '../../src/loaders/index';

/**
 * Crea una instancia del app Express con todos los middlewares y rutas,
 * sin arrancar `app.listen`. Pensada para que Supertest pegue directo al
 * handler.
 */
export function buildApp(): Express {
  const app = express();
  registerMW(app);
  registerRoutes(app);
  return app;
}
