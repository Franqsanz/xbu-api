import { Request, Response, NextFunction } from 'express';

import { BookProgressRepository } from '../../repositories/bookProgressRepository';
import { BadRequest } from '../../utils/errors';

const VALID_TYPES = ['pdf', 'epub'] as const;
type BookFileType = (typeof VALID_TYPES)[number];

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
  const { position, type, percentage } = req.body as {
    position?: number | string;
    type?: string;
    percentage?: number;
  };

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  if (position === undefined || position === null || position === '') {
    throw BadRequest('Falta la posición.');
  }

  if (!type || !VALID_TYPES.includes(type as BookFileType)) {
    throw BadRequest('Tipo inválido (debe ser pdf o epub).');
  }

  const validPercentage =
    typeof percentage === 'number' && percentage >= 0 && percentage <= 100 ? percentage : undefined;

  try {
    const record = await BookProgressRepository.upsertProgress(userId, bookId, {
      position,
      type: type as BookFileType,
      percentage: validPercentage,
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
