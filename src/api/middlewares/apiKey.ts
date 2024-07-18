import { Request, Response, NextFunction } from 'express';

export function apiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = '8CAoA36yP9vhs0Ls1SlMtkKJSD5IARblVX5g';

  try {
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }
  } catch (error) {
    throw error;
  }

  next();
}
