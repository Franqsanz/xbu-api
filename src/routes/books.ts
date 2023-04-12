import express from 'express';

import { getBooks, getBooksRandom, getOnetBooks, postBooks, putBooks, deleteBooks } from "../controllers/routes";
import { query } from "../middleware/query";

const router = express.Router();

router.get('/', query, getBooks);
router.get('/related-post', getBooksRandom);
router.get('/:id', getOnetBooks);
router.post('/', postBooks);
router.put('/:id', putBooks);
router.delete('/:id', deleteBooks);

export default router;
