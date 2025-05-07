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

const router: Router = express.Router();

router.get('/', (req, res: Response) => {
  return res.redirect('/api/books');
});
router.get('/books', pagination, query, getBooks);
router.get('/books/search', getSearchBooks);
router.get('/books/options', getAllOptions);
router.get('/books/more-books/:id', getBooksRandom);
router.get('/books/related-books/:id', getRelatedBooks);
router.get('/books/more-books-authors/:id', getMoreBooksAuthors);
router.get('/books/most-viewed-books', getMostViewedBooks);
router.get('/books/path/:pathUrl', getPathUrlBooks);
router.get('/books/:id', getOneBooks);
router.post('/books', postBooks);
router.patch('/books/:id', putBooks);
router.delete('/books/:id', deleteBook);

export default router;
