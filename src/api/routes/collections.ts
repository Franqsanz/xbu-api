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

/**
 * @openapi
 * /api/users/collections/{userId}:
 *   get:
 *     tags: [Collections]
 *     summary: Lista todas las colecciones del usuario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Colecciones del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 userId: { type: string }
 *                 collections:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Collection' }
 *                 totalCollections: { type: integer }
 */
router.get('/:userId', getAllCollections);

/**
 * @openapi
 * /api/users/collections/{userId}:
 *   post:
 *     tags: [Collections]
 *     summary: Crea una nueva colección.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *                 maxLength: 25
 *     responses:
 *       201:
 *         description: Colección creada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Collection' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/:userId', postCreateCollections);

/**
 * @openapi
 * /api/users/collections/{userId}:
 *   delete:
 *     tags: [Collections]
 *     summary: Elimina todas las colecciones del usuario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Colecciones eliminadas.
 */
router.delete('/:userId', deleteUserCollections);

/**
 * @openapi
 * /api/users/collections/collection/{collectionId}:
 *   get:
 *     tags: [Collections]
 *     summary: Detalle de una colección (libros incluidos).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Colección con sus libros.
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/collection/:collectionId', getOneCollection);

/**
 * @openapi
 * /api/users/collections/collection/{collectionId}:
 *   patch:
 *     tags: [Collections]
 *     summary: Actualiza el nombre de una colección.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, name]
 *             properties:
 *               userId: { type: string }
 *               name:
 *                 type: string
 *                 maxLength: 25
 *     responses:
 *       200:
 *         description: Nombre actualizado.
 */
router.patch('/collection/:collectionId', patchCollectionName);

/**
 * @openapi
 * /api/users/collections/{userId}/collection/{collectionId}:
 *   delete:
 *     tags: [Collections]
 *     summary: Elimina una colección específica.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: collectionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Colección eliminada.
 */
router.delete('/:userId/collection/:collectionId', deleteCollections);

/**
 * @openapi
 * /api/users/collections/{userId}/summary/{bookId}:
 *   get:
 *     tags: [Collections]
 *     summary: Colecciones del usuario indicando si el libro está incluido en cada una.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de colecciones con `checked` indicando inclusión del libro.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id: { type: string }
 *                   name: { type: string }
 *                   checked: { type: boolean }
 */
router.get('/:userId/summary/:bookId', getCollectionsForUser);

/**
 * @openapi
 * /api/users/collections/books/toggle:
 *   patch:
 *     tags: [Collections]
 *     summary: Agrega o quita un libro de una o más colecciones.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, collections, bookId, checked]
 *             properties:
 *               userId: { type: string }
 *               bookId: { type: string }
 *               checked: { type: boolean }
 *               collections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     collectionId: { type: string }
 *                     collectionName: { type: string }
 *                     isInCollection: { type: boolean }
 *     responses:
 *       200:
 *         description: Toggle aplicado a las colecciones indicadas.
 */
router.patch('/books/toggle', patchToggleBookInCollection);

/**
 * @openapi
 * /api/users/collections/remove:
 *   patch:
 *     tags: [Collections]
 *     summary: Quita un libro de una o más colecciones.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, bookId]
 *             properties:
 *               userId: { type: string }
 *               bookId: { type: string }
 *               collectionId:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items: { type: string }
 *     responses:
 *       200:
 *         description: Libro removido de la(s) colección(es).
 */
router.patch('/remove', patchRemoveBookFromCollection);

export default router;
