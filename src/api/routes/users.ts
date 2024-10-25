import express, { Router } from 'express';

import {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  getFindAllBookFavoriteByUser,
  getAllCollections,
  postCreateCollections,
  deleteCollections,
  deleteAccount,
} from '../controllers/userController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

// Usuarios
router.get('/', getUsers);
router.get('/check-user/:userId', getCheckUser);
router.get('/:userId/:username/my-books', verifyToken, pagination, getUserAndBooks);
router.get('/:userId/my-favorites', pagination, getFindAllBookFavoriteByUser);
router.get('/:userId/my-collections', getAllCollections);
router.post('/:userId/my-collections', postCreateCollections);
router.delete('/:userId/my-collections/:collectionId', deleteCollections);
router.delete('/:userId', deleteAccount);

export default router;
