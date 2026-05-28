import express, { Router } from 'express';

import {
  getFindAllBookFavoriteByUser,
  patchToggleFavorite,
  deleteUserFavorites,
} from '../controllers/favoriteController';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

/**
 * @openapi
 * /api/users/favorites/{userId}:
 *   get:
 *     tags: [Favorites]
 *     summary: Lista paginada de libros favoritos del usuario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Libros favoritos paginados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 info: { $ref: '#/components/schemas/Info' }
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Book' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/:userId', pagination, getFindAllBookFavoriteByUser);

/**
 * @openapi
 * /api/users/favorites:
 *   patch:
 *     tags: [Favorites]
 *     summary: Agrega o quita un libro de favoritos (toggle).
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId, id, isFavorite]
 *             properties:
 *               userId: { type: string }
 *               id:
 *                 type: string
 *                 description: ID del libro.
 *               isFavorite:
 *                 type: boolean
 *                 description: true para agregar, false para quitar.
 *     responses:
 *       200:
 *         description: Toggle aplicado.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/', patchToggleFavorite);

/**
 * @openapi
 * /api/users/favorites/{userId}:
 *   delete:
 *     tags: [Favorites]
 *     summary: Elimina todos los favoritos del usuario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Favoritos eliminados.
 */
router.delete('/:userId', deleteUserFavorites);

export default router;
