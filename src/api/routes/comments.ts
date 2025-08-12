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

const router: Router = express.Router();

router.get('/book-comments/:bookId', pagination, query, findAll);
router.get('/user-comments/:userId', findByUserId);
router.post('/comment', create);
router.patch('/comment/:commentId/:userId', update);
router.delete('/comment/:commentId/:userId', deleteComment);
router.post('/comment/:commentId/:userId/reaction', addReaction);
router.get('/comment/stats/:bookId', findStats);

export default router;
