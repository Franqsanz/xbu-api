import { Request, Response, NextFunction } from 'express';

import { BookRatingService } from '../../services/bookRatingService';
import { BookService } from '../../services/bookService';
import { NotificationService } from '../../services/notificationService';
import { BadRequest } from '../../utils/errors';

async function getMyRating(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { id: bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const rating = await BookRatingService.getRating(userId, bookId);
    return res.status(200).json({ rating });
  } catch (err) {
    return next(err) as any;
  }
}

async function getRatingStats(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { id: bookId } = req.params;

  try {
    const stats = await BookRatingService.getStats(bookId);
    return res.status(200).json(stats);
  } catch (err) {
    return next(err) as any;
  }
}

async function setMyRating(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { id: bookId } = req.params;
  const { rating } = req.body as { rating?: number };

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw BadRequest('Rating inválido (debe ser un entero entre 1 y 5)');
  }

  try {
    await BookRatingService.setRating(userId, bookId, rating);

    (async () => {
      try {
        const book = await BookService.findByIdRaw(bookId);
        if (book?.userId) {
          await NotificationService.createSafe({
            userId: book.userId,
            type: 'rating',
            actorId: userId,
            bookId,
            rating,
          });
        }
      } catch (err) {
        console.error('[bookRatingController.setRating] notification failed:', err);
      }
    })();

    return res.status(200).json({ rating });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteMyRating(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { id: bookId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    await BookRatingService.deleteRating(userId, bookId);
    return res.status(200).json({ rating: null });
  } catch (err) {
    return next(err) as any;
  }
}

export { getMyRating, getRatingStats, setMyRating, deleteMyRating };
