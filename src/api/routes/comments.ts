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

const router: Router = express.Router();

router.get('/book-comments/:bookId', findAll);
router.get('/user-comments/:userId', findByUserId);
router.post('/comment', create);
router.patch('/comment/:commentId/:userId', update);
router.delete('/comment/:commentId/:userId', deleteComment);
router.post('/comment/:commentId/:userId/reaction', addReaction);
router.get('/comment/stats/:bookId', findStats);

export default router;
