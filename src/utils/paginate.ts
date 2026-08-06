import { Request } from 'express';

/**
 * Metadata de paginación por página (offset).
 * Shape que devuelve el modo `?page=N` — pensado para backoffice y tablas.
 */
export type PageInfo = {
  total: number;
  totalPages: number;
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  nextPageLink: string | null;
  prevPageLink: string | null;
};

export function buildPageInfo(params: {
  req: Request;
  page: number;
  limit: number;
  total: number;
}): PageInfo {
  const { req, page, limit, total } = params;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const nextPage = page < totalPages ? page + 1 : null;
  const prevPage = page > 1 ? page - 1 : null;
  const base = `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}`;
  const nextPageLink = nextPage ? `${base}?page=${nextPage}&limit=${limit}` : null;
  const prevPageLink = prevPage ? `${base}?page=${prevPage}&limit=${limit}` : null;
  return {
    total,
    totalPages,
    currentPage: page,
    nextPage,
    prevPage,
    nextPageLink,
    prevPageLink,
  };
}

/**
 * Detecta si el request pide modo offset (page) o cursor (default).
 * El modo offset se activa sólo cuando viene explícitamente `?page=N`.
 */
export function isPageMode(req: Request): boolean {
  return typeof req.query.page === 'string' && req.query.page !== '';
}

export function parsePageParams(
  req: Request,
  defaultLimit: number,
  maxLimit: number
): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Number(req.query.page) || 1);
  const rawLimit = Number(req.query.limit ?? defaultLimit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), maxLimit)
    : defaultLimit;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}
