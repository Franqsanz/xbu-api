import { IHttpError } from '../types/types';

function HttpError(message: string, statusCode: number): IHttpError {
  const error = new Error(message) as IHttpError;
  error.statusCode = statusCode;

  return error;
}

function NotFound(message: string): IHttpError {
  return HttpError(message, 404);
}

export { HttpError, NotFound };
