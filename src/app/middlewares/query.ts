import { Request, Response, NextFunction } from 'express';

import { BookService } from '../services/bookService';

export async function query(req: Request, res: Response, next: NextFunction) {
  const { findOptionsFiltering } = BookService;
  const { category, year, language } = req.query;

  if (!category && !year && !language) {
    return next();
  }

  try {
    const results = await findOptionsFiltering(category as string, year as string, language as string);

    if (!results || results.length < 1) {
      return res.status(404).json({
        info: {
          status: res.statusCode,
          message: `No se han encontrado datos para ${req.originalUrl}.`,
        },
      });
    }

    return res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: {
        message: 'Error en el servidor',
      },
    });
  }
}
