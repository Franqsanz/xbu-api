import { Request, Response, NextFunction } from 'express';

import { BookProgressRepository } from '../../repositories/bookProgressRepository';
import { BadRequest } from '../../utils/errors';
import { bookProgressSchema, parseOrThrow } from '../../utils/validation';

type BookFileType = 'pdf' | 'epub';

async function getBookProgress(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const record = await BookProgressRepository.getProgress(userId, bookId);
    if (!record) return res.status(200).json({ progress: null });
    return res.status(200).json({
      progress: {
        position: record.position,
        type: record.type,
        percentage: record.percentage ?? null,
        updatedAt: record.updatedAt,
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function setBookProgress(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const { position, type, percentage } = parseOrThrow(bookProgressSchema, req.body);
    const record = await BookProgressRepository.upsertProgress(userId, bookId, {
      position,
      type: type as BookFileType,
      percentage,
    });
    return res.status(200).json({
      progress: {
        position: record?.position,
        type: record?.type,
        percentage: record?.percentage ?? null,
        updatedAt: record?.updatedAt,
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteBookProgress(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    await BookProgressRepository.deleteProgress(userId, bookId);
    return res.status(200).json({ progress: null });
  } catch (err) {
    return next(err) as any;
  }
}

export { getBookProgress, setBookProgress, deleteBookProgress };
