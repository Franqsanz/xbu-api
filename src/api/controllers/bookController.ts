import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { BookService } from '../../services/bookService';
import { CacheService } from '../../services/cacheService';
import { BadRequest, NotFound } from '../../utils/errors';
import { IBook, IDeleteBook, IFindBooks } from '../../types/types';

const BOOKS_CACHE_TTL = 300; // 5 minutos

async function getBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IFindBooks>> {
  const { page, limit, offset } = req.pagination!;

  try {
    // Sin paginación: respuesta directa, sin cache
    if (!limit || !page) {
      const { results, totalBooks } = await BookService.findBooks(limit, offset);
      return res.status(200).json({ totalBooks, results });
    }

    const cacheKey = `books:p${page}:l${limit}`;

    const cachedResponse = await CacheService.get<{
      info: typeof req.paginationInfo;
      results: IBook[];
    }>(cacheKey);

    if (cachedResponse) {
      return res.status(200).json(cachedResponse);
    }

    const { results, totalBooks } = await BookService.findBooks(limit, offset);

    if (results.length < 1) {
      throw NotFound('No se encontraron más libros');
    }

    req.calculatePagination!(totalBooks);
    const response = { info: req.paginationInfo, results };

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
    const result = await BookService.findByGroupFields();

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
    const relatedBooks = await BookService.findRelatedBooks(id);

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
    const moreBooksAuthors = await BookService.findMoreBooksAuthors(id);

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

  try {
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

    const bookObject = Array.isArray(result) ? result[0] : result;

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

    const result = await BookService.findMostViewedBooks(detail as string);

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

async function putBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IBook | null>> {
  const { id } = req.params;
  const { body, file } = req;

  try {
    const bookData = JSON.parse(body.bookData);

    const result = await BookService.updateBook(id, bookData, file?.buffer);

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
  getSearchBooks,
  getAllOptions,
  getBooksRandom,
  getRelatedBooks,
  getMoreBooksAuthors,
  getOneBooks,
  getPathUrlBooks,
  getMostViewedBooks,
  postBooks,
  putBooks,
  deleteBook,
};
