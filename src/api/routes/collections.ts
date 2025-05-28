import express, { Router } from 'express';

import {
  getAllCollections,
  postCreateCollections,
  deleteCollections,
  getOneCollection,
  getCollectionsForUser,
  patchCollectionName,
  patchToggleBookInCollection,
  patchRemoveBookFromCollection,
  deleteUserCollections,
} from '../controllers/collectionController';

const router: Router = express.Router();

// Colecciones del usuario
router.get('/:userId', getAllCollections);
router.post('/:userId', postCreateCollections);
router.delete('/:userId', deleteUserCollections);

// Operaciones con colección específica
router.get('/collection/:collectionId', getOneCollection);
router.patch('/collection/:collectionId', patchCollectionName);
router.delete('/:userId/collection/:collectionId', deleteCollections);

// Libros en colecciones
router.get('/:userId/summary/:bookId', getCollectionsForUser);
router.patch('/books/toggle', patchToggleBookInCollection);
router.patch('/remove', patchRemoveBookFromCollection);

export default router;
