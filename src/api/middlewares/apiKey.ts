import { Request, Response, NextFunction } from 'express';
import { UnauthorizedAccess } from '../../utils/errors';

export function apiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'];

  try {
    if (!apiKey || apiKey !== process.env.API_KEY) {
      throw UnauthorizedAccess('No tienes autorización para acceder a esta API.');
    }
  } catch (err) {
    return next(err) as any;
  }

  next();
}
