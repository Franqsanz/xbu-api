import { Request, Response, NextFunction } from 'express';

import { BookService } from '../../services/bookService';
import { NotFound } from '../../utils/errors';

export async function query(req: Request, res: Response, next: NextFunction) {
  const { authors, category, year, language } = req.query;
  const { limit, offset } = req.pagination!;

  if (!authors && !category && !year && !language) {
    return next();
  }

  try {
    const { results, totalBooks } = await BookService.findOptionsFiltering(
      authors as string,
      category as string,
      year as string,
      language as string,
      limit,
      offset
    );

    if (!results || results.length < 1) {
      throw NotFound(`No se han encontrado datos para ${req.originalUrl}.`);
    }

    req.calculatePagination!(totalBooks);

    const response = {
      info: req.paginationInfo,
      results,
    };

    return res.status(200).json(response);
  } catch (err) {
    return next(err);
  }
}
