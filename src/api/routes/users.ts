import express, { Router } from 'express';

import {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  getFindAllBookFavoriteByUser,
  patchToggleFavorite,
  getAllCollections,
  postCreateCollections,
  deleteCollections,
  getOneCollection,
  getCollectionsForUser,
  patchCollectionName,
  patchToggleBookInCollection,
  patchRemoveBookFromCollection,
  deleteUserFavorites,
  deleteUserCollections,
  deleteAccount,
} from '../controllers/userController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

// Usuarios
router.get('/', getUsers);
router.get('/check-user/:userId', getCheckUser);
router.get('/:userId/:username/books', verifyToken, pagination, getUserAndBooks);
router.delete('/:userId', deleteAccount);

// Favoritos
router.get('/:userId/favorites', pagination, getFindAllBookFavoriteByUser);
router.patch('/favorites', patchToggleFavorite);
router.delete('/:userId/favorites', deleteUserFavorites);

// Colecciones
router.get('/:userId/collections', getAllCollections);
router.get('/:userId/collections/summary/:bookId', getCollectionsForUser);
router.post('/:userId/collections', postCreateCollections);
router.delete('/:userId/collections/:collectionId', deleteCollections);
router.delete('/:userId/collecctions', deleteUserCollections);

// Colección
router.get('/collections/collection/:collectionId', getOneCollection);
router.patch('/collections/books/toggle', patchToggleBookInCollection);
router.patch('/collections/:collectionId', patchCollectionName);
router.patch('/collections/collection/remove-book', patchRemoveBookFromCollection);

export default router;
