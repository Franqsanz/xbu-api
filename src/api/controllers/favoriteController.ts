import { Request, Response, NextFunction } from 'express';

import { FavoriteService } from '../../services/favoriteService';
import { IBook, IUserAndBooks } from '../../types/types';
import { NotFound, BadRequest } from '../../utils/errors';

async function getFindAllBookFavoriteByUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IUserAndBooks>> {
  const { userId } = req.params;
  const { limit, offset, page } = req.pagination! || {};

  try {
    if (!limit || !page) {
      throw BadRequest('Faltan los parametros "page" y "limit"');
    }

    const { results, totalBooks } = await FavoriteService.findAllBookFavoriteByUser(
      userId,
      limit,
      offset
    );

    req.calculatePagination!(totalBooks);

    const response = {
      info: req.paginationInfo,
      results,
    };

    return res.status(200).json(response);
  } catch (err) {
    return next(err) as any;
  }
}

async function patchToggleFavorite(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook | null>> {
  const { userId, id, isFavorite } = req.body;
  let result;

  try {
    if (isFavorite) {
      result = await FavoriteService.addFavorite(userId, id);
    } else {
      result = await FavoriteService.removeFavorite(userId, id);
    }

    if (!result) {
      throw NotFound('Libro no encontrado');
    }

    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteUserFavorites(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { userId } = req.params;

  try {
    await FavoriteService.deleteUserFavorites(userId);

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Favoritos eliminados',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

export { getFindAllBookFavoriteByUser, patchToggleFavorite, deleteUserFavorites };
