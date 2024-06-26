import { IHttpError } from '../types/types';

function HttpError(message: string, statusCode: number): IHttpError {
  const error = new Error(message) as IHttpError;
  error.statusCode = statusCode;

  return error;
}

function BadRequest(message: string): IHttpError {
  return HttpError(message, 400);
}

function UnauthorizedAccess(message: string): IHttpError {
  return HttpError(message, 401);
}

function Forbidden(message: string): IHttpError {
  return HttpError(message, 403);
}

function NotFound(message: string): IHttpError {
  return HttpError(message, 404);
}

function TooManyRequests(message: string): IHttpError {
  return HttpError(message, 429);
}

export { HttpError, BadRequest, UnauthorizedAccess, Forbidden, NotFound, TooManyRequests };
