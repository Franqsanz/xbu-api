import { Request, Response } from 'express';
import rateLimit, { Options, ipKeyGenerator } from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';

import { redis } from '../../config/redis';
import { TooManyRequests } from '../../utils/errors';

/**
 * Key híbrido: cuando hay sesión, agrupamos por uid; sin sesión, por IP.
 * Usamos `ipKeyGenerator` (helper del propio express-rate-limit) para
 * normalizar la IP — importante en IPv6, donde sin normalizar un atacante
 * puede rotar el sufijo del /64 para saltarse el límite.
 */
function keyGenerator(prefix: string) {
  return (req: Request) => `${prefix}:${req.user?.uid ?? ipKeyGenerator(req.ip ?? '')}`;
}

/**
 * Store compartido en Redis: sobrevive restarts y funciona con múltiples
 * instancias (Render autoscale, blue/green deploys). Sin esto un atacante
 * podría alternar instancias para multiplicar su cupo.
 */
function redisStore(prefix: string) {
  return new RedisStore({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sendCommand: (...args: string[]) => (redis as any).call(...args),
    prefix: `rl:${prefix}:`,
  });
}

function handler(message: string) {
  return (_req: Request, _res: Response) => {
    throw TooManyRequests(message);
  };
}

const baseOptions: Partial<Options> = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

/**
 * Limiter para endpoints de autenticación (login, register, refresh).
 * Muy restrictivo para bloquear brute force.
 */
export const authLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 min
  max: 10,
  keyGenerator: keyGenerator('auth'),
  store: redisStore('auth'),
  handler: handler('Demasiados intentos de autenticación. Esperá 15 minutos antes de reintentar.'),
});

/**
 * Limiter para escrituras (crear/editar/eliminar recursos, subir archivos,
 * postear comentarios). Previene spam y abuso.
 */
export const mutationLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 100,
  keyGenerator: keyGenerator('mut'),
  store: redisStore('mut'),
  handler: handler('Demasiadas acciones de escritura. Esperá antes de reintentar.'),
});

/**
 * Safety net global. Cubre todas las rutas y captura scrapers agresivos.
 * Menos estricto que auth/mutations porque incluye lecturas frecuentes
 * (feed, notifications polling, book listings).
 */
export const globalLimiter = rateLimit({
  ...baseOptions,
  windowMs: 15 * 60 * 1000, // 15 min
  max: 500,
  keyGenerator: keyGenerator('all'),
  store: redisStore('all'),
  handler: handler('Demasiadas peticiones. Esperá unos minutos antes de reintentar.'),
});

// Alias para compatibilidad con el import default previo.
export default globalLimiter;
