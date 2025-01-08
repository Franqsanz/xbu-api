import express, { Router } from 'express';

import {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  getFindAllBookFavoriteByUser,
  getAllCollections,
  postCreateCollections,
  deleteCollections,
  getOneCollection,
  getCollectionsForUser,
  patchCollectionName,
  patchToggleBookInCollection,
  patchRemoveBookFromCollection,
  deleteAccount,
} from '../controllers/userController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

// Usuarios
router.get('/', getUsers);
router.get('/check-user/:userId', getCheckUser);
router.get('/:userId/:username/my-books', verifyToken, pagination, getUserAndBooks);
router.delete('/:userId', deleteAccount);

// Favoritos
router.get('/:userId/my-favorites', pagination, getFindAllBookFavoriteByUser);

// Colecciones
router.get('/:userId/my-collections', getAllCollections);
router.get('/:userId/my-collections/summary/:bookId', getCollectionsForUser);
router.post('/:userId/my-collections', postCreateCollections);
router.delete('/:userId/my-collections/:collectionId', deleteCollections);

// Colección
router.get('/my-collections/collection/:collectionId', getOneCollection);
router.patch('/my-collections/books/toggle', patchToggleBookInCollection);
router.patch('/my-collections/:collectionId', patchCollectionName);
router.patch('/my-collections/collection/remove-book', patchRemoveBookFromCollection);

export default router;
