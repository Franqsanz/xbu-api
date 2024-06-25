import express, { Response } from 'express';

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

const router = express.Router();

router.get('/', (req, res: Response) => {
  res.redirect('/api/books');
});
router.get('/books', query, getBooks);
router.get('/books/search', getSearchBooks);
router.get('/books/options', getAllOptions);
router.get('/books/more-books', getBooksRandom);
router.get('/books/related-books/:id', getRelatedBooks);
router.get('/books/more-books-authors/:id', getMoreBooksAuthors);
router.get('/books/most-viewed-books', getMostViewedBooks);
router.get('/books/path/:pathUrl', getPathUrlBooks);
router.get('/books/:id', getOneBooks);
router.post('/books', postBooks);
router.patch('/books/:id', putBooks);
router.delete('/books/:id', deleteBook);

export default router;
