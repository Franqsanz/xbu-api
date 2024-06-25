import { Request, Response, NextFunction } from 'express';
import { IHttpError } from '../../types/types';

export function errorHandler(err: IHttpError, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    error: {
      status: statusCode,
      message,
    },
  });
}
