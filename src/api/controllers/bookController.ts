import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

import { BookService } from '../../services/bookService';
import { BadRequest, NotFound } from '../../utils/errors';
import { redis } from '../../config/redis';
import { authFirebase } from '../../config/firebase';
import { IBook, IDeleteBook, IFindBooks } from '../../types/types';

const auth = authFirebase;

async function getBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IFindBooks>> {
  const { body } = req;
  const key = `books_${body}`;
  const { page, limit, offset } = req.pagination!;

  try {
    // Verifica si hay paginación
    if (!limit || !page) {
      // Eliminamos la cache
      await redis.del(key);
      // Si no hay paginación, simplemente llama al servicio y retorna la respuesta
      const { results, totalBooks } = await BookService.findBooks(limit, offset);

      return res.status(200).json({
        totalBooks,
        results,
      });
    }

    // Se elimina la cache cuando se busca por paginación
    if (limit && page) await redis.del(key);

    // Se leen los datos almacenados en cache
    const cachedData = await redis.get(key);

    // Si hay datos en la cache se envian al cliente
    if (cachedData) {
      const cachedResponse = JSON.parse(cachedData);
      return res.status(200).json(cachedResponse);
    }

    // Llamar al servicio que ejecuta las consultas
    const { results, totalBooks } = await BookService.findBooks(limit, offset);

    req.calculatePagination!(totalBooks);

    // Aquí construimos el objeto de respuesta que incluye los resultados de la consulta y la información de paginación
    const response = {
      info: req.paginationInfo,
      results,
    };

    // Si no hay datos en la cache, se envian a redis los datos de la base
    await redis.set(key, JSON.stringify(response));

    // Expiramos la cache cada 5 minutos
    await redis.expire(key, 300);

    if (results.length < 1) {
      throw NotFound('No se encontraron más libros');
    }

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
  const token = (req.headers['authorization'] || '').split(' ')[1];
  const { pathUrl } = req.params;
  let decodedToken;
  let result;

  try {
    if (token) {
      decodedToken = await auth.verifyIdToken(token);
    }

    const userId = decodedToken?.uid;

    // Terrible espagueti pero asi fue la unica forma que funcione :(
    if (!userId) {
      result = await BookService.findBySlug(pathUrl);
    } else {
      result = await BookService.findBySlugFavorite(pathUrl, userId);

      if (result) {
        if (userId && result[0]?.userId !== userId) {
          result = await BookService.findBySlugUpdateViewFavorite(pathUrl, userId);
        }
      }
    }

    if (!result) {
      throw NotFound('No se encuentra o no existe');
    }

    // Retornamos un objeto no un array
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
  const { body } = req;

  try {
    const resultBook = await BookService.createBook(body);

    if (!resultBook) {
      throw BadRequest('Error al publicar, la solicitud está vacia');
    }

    redis.expire(`books_${req.body}`, 0);
    return res.status(201).json(resultBook);
  } catch (err) {
    if (err instanceof ZodError) {
      const errorMessages = err.errors.map((error) => error.message);

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
  const { body } = req;

  try {
    const result = await BookService.updateBook(id, body);

    if (!result) {
      throw BadRequest('No se pudo actualizar');
    }

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
