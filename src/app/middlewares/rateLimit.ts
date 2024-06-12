import { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: {
      status: '429 Too Many Requests',
      message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo después de 20 minutos.'
    }
  });
};

const limiter = rateLimit({
  windowMs: 20 * 60 * 1000, // 20 minutos
  max: 80, // límite de 80 peticiones por IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler
});

export default limiter;
