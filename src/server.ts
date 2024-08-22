import express, { Express } from 'express';

import { PORT } from './config/env';
import { initSentry } from './config/sentry';
import { registerMW, registerRoutes } from './loaders/index';
import connectDB from './db/connection';

connectDB(); // Ejecutar conexión a la base de datos.

const app: Express = express();

initSentry(app);
registerMW(app); // Registrar middlewares
registerRoutes(app);

app.listen(PORT, () => console.log('Server Ready'));

export default app;
