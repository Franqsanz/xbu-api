import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { TooManyRequests } from '../../utils/errors';

const rateLimitHandler = (req: Request, res: Response) => {
  throw TooManyRequests(
    'Demasiadas peticiones desde esta IP, por favor intenta de nuevo después de 20 minutos'
  );
};

const limiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutos
  max: 300, // límite de 300 peticiones por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

export default limiter;
