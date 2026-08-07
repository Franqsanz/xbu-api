import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { BookService } from '../../services/bookService';
import { BookRatingService } from '../../services/bookRatingService';
import { CacheService } from '../../services/cacheService';
import { BadRequest, Forbidden, NotFound } from '../../utils/errors';
import { encodeIdCursor, decodeIdCursor } from '../../utils/cursor';
import { buildPageInfo, isPageMode, parsePageParams } from '../../utils/paginate';
import { IBook, IDeleteBook, IFindBooks } from '../../types/types';

const BOOKS_PAGE_SIZE = 10;
const BOOKS_MAX_LIMIT = 50;

const BOOKS_CACHE_TTL = 300; // 5 minutos
const OPTIONS_CACHE_TTL = 3600; // 1 hora
const MOST_VIEWED_CACHE_TTL = 600; // 10 minutos
const RELATED_CACHE_TTL = 1800; // 30 minutos

async function getBooks(req: Request, res: Response, next: NextFunction): Promise<Response<any>> {
  // Modo offset (`?page=N`): pensado para backoffice / paginación numerada.
  // Response con info { total, totalPages, nextPage, prevPage, nextPageLink,
  // prevPageLink } — compatible con el shape previo a la migración a cursor.
  if (isPageMode(req)) {
    const { page, limit, offset } = parsePageParams(req, BOOKS_PAGE_SIZE, BOOKS_MAX_LIMIT);
    try {
      const cacheKey = `books:page:${page}:l${limit}`;
      const cached = await CacheService.get<any>(cacheKey);
      if (cached) return res.status(200).json(cached);

      const { results, totalBooks } = await BookService.findBooks(limit, offset);
      const info = buildPageInfo({ req, page, limit, total: totalBooks });
      const response = { info: { ...info, totalBooks }, results };
      await CacheService.set(cacheKey, response, BOOKS_CACHE_TTL);
      return res.status(200).json(response);
    } catch (err) {
      return next(err) as any;
    }
  }

  const rawCursor = (req.query.cursor as string) || null;
  const rawLimit = Number(req.query.limit ?? BOOKS_PAGE_SIZE);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), BOOKS_MAX_LIMIT)
    : BOOKS_PAGE_SIZE;

  const cursorId = rawCursor ? decodeIdCursor(rawCursor) : null;
  if (rawCursor && !cursorId) {
    return next(BadRequest('Cursor inválido.')) as any;
  }

  try {
    const cacheKey = `books:cursor:${cursorId ?? 'first'}:l${limit}`;

    const cachedResponse = await CacheService.get<any>(cacheKey);
    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    const { results, totalBooks } = await BookService.findBooksByCursor(cursorId, limit);

    const last = results[results.length - 1];
    const nextCursor = results.length === limit && last ? encodeIdCursor(String(last._id)) : null;
    const nextUrl = nextCursor
      ? `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}?cursor=${nextCursor}&limit=${limit}`
      : null;

    const info: {
      nextCursor: string | null;
      nextUrl: string | null;
      totalBooks?: number;
    } = { nextCursor, nextUrl };
    if (totalBooks !== null) info.totalBooks = totalBooks;

    const response = { info, results };

    await CacheService.set(cacheKey, response, BOOKS_CACHE_TTL);

    return res.status(200).json(response);
  } catch (err) {
    return next(err) as any;
  }
}

/**
 * Filtros con cursor + facet counts. Endpoint separado de `/books` para no
 * mezclar shapes de response: `/books` es listado cronológico puro,
 * `/books/filter` es filtro + agregaciones para sidebar.
 *
 * Counts (`*Counts`) se computan sobre TODOS los docs que matchean el filtro
 * y solo viajan en la 1ra página. En páginas subsiguientes (con `?cursor=...`)
 * la respuesta trae solo `{ info: { nextCursor, nextUrl }, results }`.
 */
async function getFilteredBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<any>> {
  const q = req.query as Record<string, string | undefined>;

  // Filtros principales (single, típicamente vienen del URL path del front)
  const category = q.category;
  const authors = q.authors;

  // Compat: si el URL trae `year=2020` o `language=Español` como filtro principal,
  // los tratamos como multi de 1 elemento — pattern legacy del router del front.
  const yearsRaw = q.years ?? q.year;
  const languagesRaw = q.languages ?? q.language;

  const years = yearsRaw ? yearsRaw.split(',').filter(Boolean) : undefined;
  const languages = languagesRaw ? languagesRaw.split(',').filter(Boolean) : undefined;
  const minPages = q.minPages !== undefined ? Number(q.minPages) : undefined;
  const maxPages = q.maxPages !== undefined ? Number(q.maxPages) : undefined;

  const hasAny =
    !!category ||
    !!authors ||
    (years && years.length > 0) ||
    (languages && languages.length > 0) ||
    minPages !== undefined ||
    maxPages !== undefined;

  if (!hasAny) {
    return next(
      BadRequest(
        'Se requiere al menos un filtro (category, authors, years, languages, minPages, maxPages).'
      )
    ) as any;
  }

  const rawCursor = (req.query.cursor as string) || null;
  const rawLimit = Number(req.query.limit ?? BOOKS_PAGE_SIZE);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), BOOKS_MAX_LIMIT)
    : BOOKS_PAGE_SIZE;

  const cursorId = rawCursor ? decodeIdCursor(rawCursor) : null;
  if (rawCursor && !cursorId) {
    return next(BadRequest('Cursor inválido.')) as any;
  }

  try {
    const filters = { category, authors, years, languages, minPages, maxPages };
    const cacheKey = `books:filter:${JSON.stringify(filters)}:c${cursorId ?? 'first'}:l${limit}`;

    const cached = await CacheService.get<any>(cacheKey);
    if (cached) return res.status(200).json(cached);

    const result = await BookService.findFilteredBooksByCursor(filters, cursorId, limit);
    const results = result.results ?? [];

    if (cursorId === null && results.length < 1) {
      throw NotFound(`No se han encontrado datos para ${req.originalUrl}.`);
    }

    const last = results[results.length - 1] as { _id?: unknown } | undefined;
    const nextCursor =
      results.length === limit && last?._id ? encodeIdCursor(String(last._id)) : null;

    // Serializamos los filtros al nextUrl para que sea auto-navegable
    const nextParams = new URLSearchParams();
    if (category) nextParams.set('category', category);
    if (authors) nextParams.set('authors', authors);
    if (years && years.length) nextParams.set('years', years.join(','));
    if (languages && languages.length) nextParams.set('languages', languages.join(','));
    if (minPages !== undefined) nextParams.set('minPages', String(minPages));
    if (maxPages !== undefined) nextParams.set('maxPages', String(maxPages));
    nextParams.set('limit', String(limit));
    const nextUrl = nextCursor
      ? `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}?${nextParams.toString()}&cursor=${nextCursor}`
      : null;

    // 1ra página: incluye counts + totalBooks. Páginas siguientes: solo cursor.
    const info: Record<string, unknown> = { nextCursor, nextUrl };
    if (cursorId === null) {
      info.totalBooks = result.totalBooks;
      info.languageCounts = result.languageCounts;
      info.yearCounts = result.yearCounts;
      info.pagesCounts = result.pagesCounts;
      info.authorsCounts = result.authorsCounts;
    }

    const response = { info, results };
    await CacheService.set(cacheKey, response, BOOKS_CACHE_TTL);
    return res.status(200).json(response);
  } catch (err) {
    return next(err) as any;
  }
}

async function getSearchBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook[]>> {
  const { q } = req.query;

  try {
    const results = await BookService.findSearch(q);

    if (results.length < 1) {
      throw NotFound(`No se encontraron resultados para: ${q}`);
    }

    return res.status(200).json(results);
  } catch (err) {
    return next(err) as any;
  }
}

async function getAllOptions(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook[]>> {
  try {
    const result = await CacheService.getOrSet(
      'books:options',
      () => BookService.findByGroupFields(),
      OPTIONS_CACHE_TTL
    );

    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function getBooksRandom(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook[]>> {
  const { id } = req.params;

  try {
    const result = await BookService.findBooksRandom(id);

    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function getRelatedBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook[]>> {
  const { id } = req.params;

  try {
    const relatedBooks = await CacheService.getOrSet(
      `books:related:${id}`,
      () => BookService.findRelatedBooks(id),
      RELATED_CACHE_TTL
    );

    return res.status(200).json(relatedBooks);
  } catch (err) {
    return next(err) as any;
  }
}

async function getMoreBooksAuthors(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook[]>> {
  const { id } = req.params;

  try {
    const moreBooksAuthors = await CacheService.getOrSet(
      `books:more-by-authors:${id}`,
      () => BookService.findMoreBooksAuthors(id),
      RELATED_CACHE_TTL
    );

    return res.status(200).json(moreBooksAuthors);
  } catch (err) {
    return next(err) as any;
  }
}

async function getOneBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook[] | null>> {
  const { id } = req.params;

  try {
    const result = await BookService.findById(id);

    if (!result) {
      throw NotFound('No se encuentra o no existe');
    }

    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function getPathUrlBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook | null>> {
  const { pathUrl } = req.params;
  const userId = req.user?.uid ?? null;
  const cacheKey = `books:path:${pathUrl}:user:${userId ?? 'guest'}`;

  try {
    // Nota: en hit no se incrementa views (throttling natural de 5min por usuario)
    const bookObject = await CacheService.getOrSet(
      cacheKey,
      async () => {
        let result;

        if (!userId) {
          result = await BookService.findBySlug(pathUrl);
        } else {
          result = await BookService.findBySlugFavorite(pathUrl, userId);

          if (result && result.length > 0 && result[0]?.userId !== userId) {
            result = await BookService.findBySlugUpdateViewFavorite(pathUrl, userId);
          }
        }

        if (!result || (Array.isArray(result) && result.length === 0)) {
          throw NotFound('No se encuentra o no existe');
        }

        const raw: any = Array.isArray(result) ? result[0] : result;
        const book = typeof raw?.toJSON === 'function' ? raw.toJSON() : raw;
        const bookId = (book.id ?? book._id)?.toString();
        const stats = bookId
          ? await BookRatingService.getStats(bookId)
          : { averageRating: 0, ratingsCount: 0 };

        return { ...book, ...stats };
      },
      BOOKS_CACHE_TTL
    );

    return res.status(200).json(bookObject);
  } catch (err) {
    return next(err) as any;
  }
}

async function getMostViewedBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook[]>> {
  const { detail } = req.query;

  try {
    if (!detail || (detail !== 'summary' && detail !== 'full')) {
      throw BadRequest('Parámetro detail inválido');
    }

    const result = await CacheService.getOrSet(
      `books:most-viewed:${detail}`,
      () => BookService.findMostViewedBooks(detail as string),
      MOST_VIEWED_CACHE_TTL
    );

    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function postBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook>> {
  const { body, file } = req;

  try {
    const bookData = JSON.parse(body.bookData);
    // Forzamos el userId al del token: no confiamos en lo que mande el cliente
    bookData.userId = req.user.uid;

    const resultBook = await BookService.createBook(bookData, file?.buffer);

    if (!resultBook) {
      throw BadRequest('Error al publicar, la solicitud está vacia');
    }

    await CacheService.invalidatePattern('books:*');

    return res.status(201).json(resultBook);
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      const errorMessages = err.issues.map((error) => error.message);
      return res.status(400).json({
        error: {
          status: 400,
          message: errorMessages,
        },
      });
    }

    return next(err) as any;
  }
}

async function postOriginalBook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook>> {
  const files = req.files as
    | { image?: Express.Multer.File[]; bookFile?: Express.Multer.File[] }
    | undefined;
  const imageFile = files?.image?.[0];
  const bookFile = files?.bookFile?.[0];

  try {
    if (!imageFile) throw BadRequest('Falta la portada del libro.');
    if (!bookFile) throw BadRequest('Falta el archivo del libro (PDF o EPUB).');

    const bookData = JSON.parse(req.body.bookData);
    bookData.userId = req.user.uid;

    const resultBook = await BookService.createOriginalBook(
      bookData,
      imageFile.buffer,
      bookFile.buffer,
      req.ip
    );

    if (!resultBook) {
      throw BadRequest('Error al publicar, la solicitud está vacia');
    }

    await CacheService.invalidatePattern('books:*');

    return res.status(201).json(resultBook);
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      const errorMessages = err.issues.map((error) => error.message);
      return res.status(400).json({
        error: {
          status: 400,
          message: errorMessages,
        },
      });
    }

    return next(err) as any;
  }
}

async function getBookReadUrl(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<{ url: string; type: string; expiresAt: number }>> {
  const { id } = req.params;

  try {
    const result = await BookService.getReadUrl(id, req.user.uid);
    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function putBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook | null>> {
  const { id } = req.params;
  const files = req.files as
    | { image?: Express.Multer.File[]; bookFile?: Express.Multer.File[] }
    | undefined;
  const imageFile = files?.image?.[0];
  const bookFile = files?.bookFile?.[0];

  try {
    const existing = await BookService.findByIdRaw(id);
    if (!existing) {
      throw NotFound('Libro no encontrado');
    }
    if (existing.userId !== req.user.uid) {
      throw Forbidden('No tienes permisos para editar este libro');
    }

    const bookData = JSON.parse(req.body.bookData);

    if (bookFile && existing.kind !== 'original') {
      throw BadRequest('Solo los libros propios admiten reemplazar el archivo.');
    }

    const result = await BookService.updateBook(id, bookData, imageFile?.buffer, bookFile?.buffer);

    if (!result) {
      throw BadRequest('No se pudo actualizar');
    }

    await CacheService.invalidatePattern('books:*');

    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteBook(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IDeleteBook>> {
  const { id } = req.params;

  try {
    const existing = await BookService.findByIdRaw(id);
    if (!existing) {
      throw NotFound('Libro no encontrado');
    }
    if (existing.userId !== req.user.uid) {
      throw Forbidden('No tienes permisos para eliminar este libro');
    }

    const book = await BookService.removeBook(id);

    if (!book) {
      throw NotFound('Libro no encontrado');
    }

    await CacheService.invalidatePattern('books:*');

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Libro eliminado',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

export {
  getBooks,
  getFilteredBooks,
  getSearchBooks,
  getAllOptions,
  getBooksRandom,
  getRelatedBooks,
  getMoreBooksAuthors,
  getOneBooks,
  getPathUrlBooks,
  getMostViewedBooks,
  postBooks,
  postOriginalBook,
  getBookReadUrl,
  putBooks,
  deleteBook,
};
