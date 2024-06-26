import { Request, Response, NextFunction } from 'express';

import { BookService } from '../../services/bookService';
import { NotFound } from '../../utils/errors';

export async function query(req: Request, res: Response, next: NextFunction) {
  const { findOptionsFiltering } = BookService;
  const { authors, category, year, language } = req.query;

  if (!authors && !category && !year && !language) {
    return next();
  }

  try {
    const results = await findOptionsFiltering(
      authors as string,
      category as string,
      year as string,
      language as string
    );

    if (!results || results.length < 1) {
      throw NotFound(`No se han encontrado datos para ${req.originalUrl}.`);
    }

    return res.status(200).json(results);
  } catch (err) {
    return next(err);
  }
}
