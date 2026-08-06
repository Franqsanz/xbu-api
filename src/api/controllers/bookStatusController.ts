import { Request, Response, NextFunction } from 'express';

import { BookStatusService } from '../../services/bookStatusService';
import { BookStatusValue } from '../../types/types';
import { BookStatusResponse } from '../../types/responses';
import { BadRequest } from '../../utils/errors';
import { bookStatusSchema, parseOrThrow } from '../../utils/validation';

const VALID_STATUSES: BookStatusValue[] = ['read', 'reading', 'want_to_read'];

async function getBookStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<BookStatusResponse>> {
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
): Promise<Response<BookStatusResponse>> {
  const userId = req.user?.uid;
  const { bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  const { status } = parseOrThrow(bookStatusSchema, req.body);

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
): Promise<Response<BookStatusResponse>> {
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

async function getBooksByStatus(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { status } = req.query as { status?: string };
  const { limit, offset } = req.pagination!;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  if (!status || !VALID_STATUSES.includes(status as BookStatusValue)) {
    throw BadRequest('Estado inválido');
  }

  try {
    const { results, totalBooks } = await BookStatusService.listBooksByUserAndStatus(
      userId,
      status as BookStatusValue,
      limit,
      offset
    );

    req.calculatePagination!(totalBooks);

    return res.status(200).json({ info: req.paginationInfo, results });
  } catch (err) {
    return next(err) as any;
  }
}

export { getBookStatus, setBookStatus, deleteBookStatus, getBooksByStatus };
