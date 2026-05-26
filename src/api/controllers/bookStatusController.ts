import { Request, Response, NextFunction } from 'express';

import { BookStatusService } from '../../services/bookStatusService';
import { BookStatusValue } from '../../types/types';
import { BadRequest } from '../../utils/errors';

const VALID_STATUSES: BookStatusValue[] = ['read', 'reading', 'want_to_read'];

async function getBookStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<any>> {
  const userId = req.user?.uid;
  const { bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const record = await BookStatusService.getStatus(userId, bookId);
    return res.status(200).json({ status: record?.status ?? null });
  } catch (err) {
    return next(err) as any;
  }
}

async function setBookStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<any>> {
  const userId = req.user?.uid;
  const { bookId } = req.params;
  const { status } = req.body as { status?: string };

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  if (!status || !VALID_STATUSES.includes(status as BookStatusValue)) {
    throw BadRequest('Estado inválido');
  }

  try {
    const record = await BookStatusService.setStatus(userId, bookId, status as BookStatusValue);
    return res.status(200).json({ status: record?.status ?? null });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteBookStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<any>> {
  const userId = req.user?.uid;
  const { bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    await BookStatusService.deleteStatus(userId, bookId);
    return res.status(200).json({ status: null });
  } catch (err) {
    return next(err) as any;
  }
}

export { getBookStatus, setBookStatus, deleteBookStatus };
