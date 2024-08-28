import express, { Router } from 'express';

import {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  getFavoritesByUser,
  deleteAccount,
} from '../controllers/userController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

// Usuarios
router.get('/', getUsers);
router.get('/check-user/:userId', getCheckUser);
router.get('/:userId/:username/my-books', verifyToken, pagination, getUserAndBooks);
router.get('/:userId/my-favorites', getFavoritesByUser);
router.delete('/:userId', deleteAccount);

export default router;
