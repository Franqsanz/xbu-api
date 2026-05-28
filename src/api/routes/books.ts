import express, { Response, Router } from 'express';

import {
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
} from '../controllers/bookController';
import { query } from '../middlewares/query';
import { pagination } from '../middlewares/pagination';
import { upload } from '../middlewares/multer';
import { optionalAuth } from '../middlewares/optionalAuth';

const router: Router = express.Router();

router.get('/', (req, res: Response) => {
  return res.redirect('/api/books');
});

/**
 * @openapi
 * /api/books:
 *   get:
 *     tags: [Books]
 *     summary: Lista paginada de libros.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: authors
 *         schema: { type: string }
 *         description: Filtro por autor.
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Filtro por categoría.
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: language
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista paginada de libros.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 info:
 *                   $ref: '#/components/schemas/Info'
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Book' }
 */
router.get('/books', pagination, query, getBooks);

/**
 * @openapi
 * /api/books/search:
 *   get:
 *     tags: [Books]
 *     summary: Busca libros por título o autor.
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Resultados de la búsqueda.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Book' }
 */
router.get('/books/search', getSearchBooks);

/**
 * @openapi
 * /api/books/options:
 *   get:
 *     tags: [Books]
 *     summary: Opciones de filtrado disponibles (autores, categorías, años, idiomas).
 *     responses:
 *       200:
 *         description: Opciones para filtros.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authors: { type: array, items: { type: string } }
 *                 category: { type: array, items: { type: string } }
 *                 year: { type: array, items: { type: integer } }
 *                 language: { type: array, items: { type: string } }
 */
router.get('/books/options', getAllOptions);

/**
 * @openapi
 * /api/books/more-books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Libros aleatorios (excluyendo el ID dado).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de libros recomendados.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Book' }
 */
router.get('/books/more-books/:id', getBooksRandom);

/**
 * @openapi
 * /api/books/related-books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Libros relacionados al libro especificado (misma categoría).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de libros relacionados.
 */
router.get('/books/related-books/:id', getRelatedBooks);

/**
 * @openapi
 * /api/books/more-books-authors/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Otros libros del mismo autor.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Libros del mismo autor.
 */
router.get('/books/more-books-authors/:id', getMoreBooksAuthors);

/**
 * @openapi
 * /api/books/most-viewed-books:
 *   get:
 *     tags: [Books]
 *     summary: Libros más vistos.
 *     parameters:
 *       - in: query
 *         name: detail
 *         schema: { type: string }
 *         description: Filtro adicional opcional.
 *     responses:
 *       200:
 *         description: Lista de libros ordenados por views desc.
 */
router.get('/books/most-viewed-books', getMostViewedBooks);

/**
 * @openapi
 * /api/books/path/{pathUrl}:
 *   get:
 *     tags: [Books]
 *     summary: Detalle de libro por slug (pathUrl).
 *     description: Si hay sesión válida (cookie o Bearer), incluye `isFavorite` indicando si el usuario lo tiene en favoritos.
 *     parameters:
 *       - in: path
 *         name: pathUrl
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Detalle del libro.
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/Book'
 *                 - type: object
 *                   properties:
 *                     isFavorite: { type: boolean }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/books/path/:pathUrl', optionalAuth, getPathUrlBooks);

/**
 * @openapi
 * /api/books/{id}:
 *   get:
 *     tags: [Books]
 *     summary: Detalle de libro por ID.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Libro encontrado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Book' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/books/:id', getOneBooks);

/**
 * @openapi
 * /api/books:
 *   post:
 *     tags: [Books]
 *     summary: Crea un nuevo libro.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               bookData:
 *                 type: string
 *                 description: JSON stringify con campos title, authors, synopsis, year, category, numberPages, sourceLink, language, format, pathUrl, userId, rating.
 *     responses:
 *       201:
 *         description: Libro creado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Book' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/books', upload.single('image'), postBooks);

/**
 * @openapi
 * /api/books/{id}:
 *   patch:
 *     tags: [Books]
 *     summary: Actualiza un libro existente.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               bookData:
 *                 type: string
 *     responses:
 *       200:
 *         description: Libro actualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Book' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/books/:id', upload.single('image'), putBooks);

/**
 * @openapi
 * /api/books/{id}:
 *   delete:
 *     tags: [Books]
 *     summary: Elimina un libro.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Libro eliminado.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/books/:id', deleteBook);

export default router;
