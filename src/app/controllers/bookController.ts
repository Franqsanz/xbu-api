import { Request, Response } from 'express';

import { BookService } from '../services/bookService';
import { redis } from '../../config/redis';
import { IBook, IDeleteBook, IFindBooks } from '../../types/types';

const {
  findAllBooks,
  findOne,
  findBySlug,
  findSearch,
  findByGroupFields,
  findBooksRandom,
  findRelatedBooks,
  findMoreBooksAuthors,
  findMostViewedBooks,
  createBook,
  updateBook,
  removeBook,
} = BookService;

async function getBooks(req: Request, res: Response): Promise<Response<IFindBooks>> {
  const { body } = req;
  const key = `books_${body}`;
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string) || 1;
  const offset = (page - 1) * limit;

  try {
    // Llamar al servicio que ejecuta las consultas
    const { results, totalBooks } = await findAllBooks(limit, offset);

    // Aquí calculamos el número total de páginas
    const totalPages = Math.ceil(totalBooks / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const prevPage = page > 1 ? page - 1 : null;
    const nextPageLink = nextPage ? `${req.protocol}://${req.get('host')}/api${req.path}?page=${nextPage}${limit ? `&limit=${limit}` : ''}` : null;
    const prevPageLink = page > 1 ? `${req.protocol}://${req.get('host')}/api${req.path}?page=${page - 1}${limit ? `&limit=${limit}` : ''}` : null;

    // Aquí construimos el objeto de paginación para incluir en la respuesta
    const info = {
      totalBooks,
      totalPages,
      currentPage: page,
      nextPage: nextPage,
      prevPage: prevPage,
      nextPageLink: nextPageLink,
      prevPageLink: prevPageLink,
    };

    // Aquí construimos el objeto de respuesta que incluye los resultados de la consulta y la información de paginación
    const response = {
      info,
      results,
    };

    // Se elimina la cache cuando se busca por paginación
    if (limit && page) await redis.del(key);

    // Se leen los datos almacenados en cache
    const cachedData = await redis.get(key);

    // Si hay datos en la cache se envian al cliente
    if (cachedData) {
      const cachedResponse = JSON.parse(cachedData);
      return res.status(200).json(cachedResponse);
    }

    // Si no hay datos en la cache, se envian a redis los datos de la base
    await redis.set(key, JSON.stringify(response));

    // Expiramos la cache cada 5 minutos
    await redis.expire(key, 300);

    if (results.length < 1) {
      return res.status(404).json({ info: { message: 'No se encontraron más libros' } });
    }

    return res.status(200).json(response);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getSearchBooks(req: Request, res: Response): Promise<Response<IBook[]>> {
  const { q } = req.query;

  try {
    const results = await findSearch(q);

    if (results.length < 1) {
      return res.status(404).json({ info: { message: `No se encontraron resultados para: ${q}` } });
    }

    return res.status(200).json(results);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getAllOptions(req: Request, res: Response): Promise<Response<IBook[]>> {
  try {
    const result = await findByGroupFields();

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getBooksRandom(req: Request, res: Response): Promise<Response<IBook[]>> {
  try {
    const result = await findBooksRandom();

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getRelatedBooks(req: Request, res: Response): Promise<Response<IBook[]>> {
  const { id } = req.params;

  try {
    const relatedBooks = await findRelatedBooks(id);

    return res.status(200).json(relatedBooks);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getMoreBooksAuthors(req: Request, res: Response): Promise<Response<IBook[]>> {
  const { id } = req.params;

  try {
    const moreBooksAuthors = await findMoreBooksAuthors(id);

    return res.status(200).json(moreBooksAuthors);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getOneBooks(req: Request, res: Response): Promise<Response<IBook[] | null>> {
  const { id } = req.params;

  try {
    const result = await findOne(id);

    if (!result) {
      return res.status(404).json({ info: { message: 'No se encuentra o no existe' } });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getPathUrlBooks(req: Request, res: Response): Promise<Response<IBook[] | null>> {
  const { pathUrl } = req.params;

  try {
    const result = await findBySlug(pathUrl);

    if (!result) {
      return res.status(404).json({ info: { message: 'No se encuentra o no existe' } });
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getMostViewedBooks(req: Request, res: Response): Promise<Response<IBook[]>> {
  const { detail } = req.query;

  try {
    if (!detail || (detail !== 'summary' && detail !== 'full')) {
      return res.status(400).json({ error: { message: 'Parámetro detail inválido' } });
    }

    const result = await findMostViewedBooks(detail as string);

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function postBooks(req: Request, res: Response): Promise<Response<IBook>> {
  const { body } = req;

  try {
    const resultBook = await createBook(body);

    if (!resultBook) {
      return res.status(400).json({ error: { message: 'Error al publicar, la solicitud está vacia' } });
    }

    redis.expire(`books_${req.body}`, 0);
    return res.status(201).json(resultBook);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function putBooks(req: Request, res: Response): Promise<Response<IBook | null>> {
  const { id } = req.params;
  const { body } = req;

  try {
    const result = await updateBook(id, body);

    if (!result) {
      return res.status(400).json({ error: { message: 'No se pudo actualizar' } });
    }

    return res.status(201).json(result);
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function deleteBook(req: Request, res: Response): Promise<Response<IDeleteBook>> {
  const { id } = req.params;

  try {
    const book = await removeBook(id);

    if (!book) {
      return res.status(404).json({ info: { message: 'Libro no encontrado' } });
    }

    return res.status(200).json({ success: { message: 'Libro eliminado' } });
  } catch (err) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
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
