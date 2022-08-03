import express from 'express';
import { getBooks, getOnetBooks, postBooks, putBooks, deleteBooks } from "../controllers/routes";

const router = express.Router();

router.get('/', getBooks);
router.get('/:id', getOnetBooks);
router.post('/', postBooks);
router.put('/:id', putBooks);
router.delete('/:id', deleteBooks);

export default router;