import express from 'express';

import {
  getBooks,
  getSearchBooks,
  getAllOptions,
  getBooksRandom,
  getOneBooks,
  getPathUrlBooks,
  postBooks,
  putBooks,
  deleteBooks
} from "../controllers/routes";
import { query } from "../middleware/query";

const router = express.Router();

router.get('/books', query, getBooks);
router.get('/books/search', getSearchBooks);
router.get('/options', getAllOptions);
router.get('/related-post', getBooksRandom);
router.get('/book/path/:pathUrl', getPathUrlBooks);
router.get('/book/:id', getOneBooks);
router.post('/books', postBooks);
router.patch('/book/:id', putBooks);
router.delete('/book/:id', deleteBooks);

export default router;
