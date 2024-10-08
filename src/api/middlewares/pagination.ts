import { Request, Response, NextFunction } from 'express';

import { Pagination, PaginationInfo } from '../../types/types';

declare module 'express-serve-static-core' {
  interface Request {
    pagination?: Pagination;
    calculatePagination?: (
      totalBooks: number,
      yearCounts?: number | undefined,
      languageCounts?: number | undefined,
      pagesCounts?: number | undefined,
      authorsCounts?: number | undefined
    ) => void;
    paginationInfo?: PaginationInfo;
  }
}

export function pagination(req: Request, res: Response, next: NextFunction) {
  let limit = parseInt(req.query.limit as string);
  let page = parseInt(req.query.page as string) || 1;

  if (page < 1) page = 1;
  if (limit < 1) limit = 10;

  const offset = (page - 1) * limit;

  req.pagination = { page, limit, offset };

  req.calculatePagination = (
    totalBooks: number,
    yearCounts?: number,
    languageCounts?: number,
    pagesCounts?: number,
    authorsCounts?: number
  ): void => {
    const { page, limit } = req.pagination!;

    // Aquí calculamos el número total de páginas
    const totalPages = Math.ceil(totalBooks / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;
    const nextPageLink = nextPage
      ? `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}?page=${nextPage}${limit ? `&limit=${limit}` : ''}`
      : null;
    const prevPageLink = prevPage
      ? `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}?page=${page - 1}${limit ? `&limit=${limit}` : ''}`
      : null;

    // Aquí construimos el objeto de paginación para incluir en la respuesta
    req.paginationInfo = {
      totalBooks,
      totalPages,
      currentPage: page,
      nextPage,
      prevPage,
      nextPageLink,
      prevPageLink,
      yearCounts, // El campo "yearCounts" es opcional.
      languageCounts, // El campo "languageCounts" es opcional.
      pagesCounts, // El campo "languageCounts" es opcional.
      authorsCounts, // El campo "languageCounts" es opcional.
    };
  };

  next();
}
