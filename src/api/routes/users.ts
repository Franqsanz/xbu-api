import express from 'express';

import {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  deleteAccount,
} from '../controllers/userController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';

const router = express.Router();

// Usuarios
router.get('/', getUsers);
router.get('/check-user/:userId', getCheckUser);
router.get('/:userId/:username/my-books', verifyToken, pagination, getUserAndBooks);
router.delete('/:userId', deleteAccount);

export default router;
