import express, { Router } from 'express';

import {
  create,
  update,
  findAll,
  findByUserId,
  deleteComment,
  addReaction,
  findStats,
} from '../controllers/commentController';
import { query } from '../middlewares/query';
import { pagination } from '../middlewares/pagination';
import { authMiddleware } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.get('/book-comments/:bookId', pagination, query, findAll);
router.get('/user-comments/:userId', findByUserId);
router.get('/comment/stats/:bookId', findStats);
router.post('/comment', authMiddleware, create);
router.patch('/comment/:commentId/:userId', authMiddleware, update);
router.delete('/comment/:commentId/:userId', authMiddleware, deleteComment);
router.post('/comment/:commentId/:userId/reaction', authMiddleware, addReaction);

export default router;
