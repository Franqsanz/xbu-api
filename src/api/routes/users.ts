import express, { Router } from 'express';

import {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  deleteAccount,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStats,
} from '../controllers/userController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

router.get('/', getUsers);
router.get('/me', verifyToken, getCheckUser);
router.get('/:userId/:username/books', verifyToken, pagination, getUserAndBooks);
router.post('/follow/:targetUserId', verifyToken, followUser);
router.delete('/follow/:targetUserId', verifyToken, unfollowUser);
router.get('/:userId/followers', getFollowers);
router.get('/:userId/following', getFollowing);
router.get('/:userId/follow-stats', getFollowStats);
router.delete('/:userId', deleteAccount);

export default router;
