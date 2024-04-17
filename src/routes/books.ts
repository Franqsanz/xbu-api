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
  deleteBooks,
} from "../controllers/routes";
import { query } from "../middleware/query";

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
router.get('/book/path/:pathUrl', getPathUrlBooks);
router.get('/book/:id', getOneBooks);
router.post('/book/post', postBooks);
router.patch('/book/update/:id', putBooks);
router.delete('/book/delete/:id', deleteBooks);

export default router;
