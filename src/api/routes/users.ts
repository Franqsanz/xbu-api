import express, { Router } from 'express';

import {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  getUserAndBooksByUsername,
  deleteAccount,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStats,
  getFeed,
} from '../controllers/userController';
import {
  getBookStatus,
  setBookStatus,
  deleteBookStatus,
} from '../controllers/bookStatusController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: Lista todos los usuarios.
 *     responses:
 *       200:
 *         description: Lista de usuarios.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/User' }
 */
router.get('/', getUsers);

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Datos del usuario autenticado.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Datos del usuario actual.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/me', verifyToken, getCheckUser);

/**
 * @openapi
 * /api/users/me/feed:
 *   get:
 *     tags: [Feed]
 *     summary: Feed de actividad social paginado.
 *     description: |
 *       Devuelve la actividad cronológica de los usuarios que sigue el actual y la propia.
 *       Tipos de actividad: `book` (publicación), `comment`, `status` (estado de lectura),
 *       `follow` (siguió a otro usuario), `favorite` (guardó en favoritos),
 *       `collection` (agregó a una colección).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Activities ordenadas por fecha desc.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 activities:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/FeedActivity' }
 *                 info:
 *                   type: object
 *                   properties:
 *                     total: { type: integer }
 *                     limit: { type: integer }
 *                     offset: { type: integer }
 *                     nextPage: { type: integer, nullable: true }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me/feed', verifyToken, getFeed);

/**
 * @openapi
 * /api/users/me/book-status/{bookId}:
 *   get:
 *     tags: [BookStatus]
 *     summary: Estado de lectura del libro para el usuario actual.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Estado actual (o null si no fue marcado).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [read, reading, want_to_read, null]
 *                   nullable: true
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me/book-status/:bookId', verifyToken, getBookStatus);

/**
 * @openapi
 * /api/users/me/book-status/{bookId}:
 *   patch:
 *     tags: [BookStatus]
 *     summary: Setea o actualiza el estado de lectura de un libro (upsert).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [read, reading, want_to_read]
 *     responses:
 *       200:
 *         description: Estado actualizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: string, enum: [read, reading, want_to_read] }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/me/book-status/:bookId', verifyToken, setBookStatus);

/**
 * @openapi
 * /api/users/me/book-status/{bookId}:
 *   delete:
 *     tags: [BookStatus]
 *     summary: Elimina la marca de estado de lectura.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Marca eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status: { type: 'null' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/me/book-status/:bookId', verifyToken, deleteBookStatus);

/**
 * @openapi
 * /api/users/profile/{username}/books:
 *   get:
 *     tags: [Users]
 *     summary: Perfil y libros de un usuario por username.
 *     description: |
 *       Incluye `followersCount`, `followingCount` e `isFollowing` (true si el actual sigue
 *       al perfil consultado).
 *     parameters:
 *       - in: path
 *         name: username
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
 *         description: Perfil + lista paginada de libros publicados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 info: { $ref: '#/components/schemas/Info' }
 *                 user: { $ref: '#/components/schemas/User' }
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Book' }
 *                 isFollowing: { type: boolean }
 *                 followersCount: { type: integer }
 *                 followingCount: { type: integer }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/profile/:username/books', pagination, getUserAndBooksByUsername);

/**
 * @openapi
 * /api/users/{userId}/{username}/books:
 *   get:
 *     tags: [Users]
 *     summary: Libros publicados por un usuario (variante con userId).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Libros del usuario.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/:userId/:username/books', verifyToken, pagination, getUserAndBooks);

/**
 * @openapi
 * /api/users/follow/{targetUserId}:
 *   post:
 *     tags: [Follow]
 *     summary: Sigue a otro usuario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       201:
 *         description: Siguiendo al usuario.
 *       400:
 *         description: No podés seguirte a vos mismo o ya lo estás siguiendo.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.post('/follow/:targetUserId', verifyToken, followUser);

/**
 * @openapi
 * /api/users/follow/{targetUserId}:
 *   delete:
 *     tags: [Follow]
 *     summary: Deja de seguir a un usuario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dejó de seguir al usuario.
 *       400:
 *         description: No estabas siguiendo al usuario.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/follow/:targetUserId', verifyToken, unfollowUser);

/**
 * @openapi
 * /api/users/{userId}/followers:
 *   get:
 *     tags: [Follow]
 *     summary: Lista de seguidores del usuario.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Seguidores paginados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id: { type: string }
 *                     username: { type: string }
 *                 followers:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/UserSummary' }
 *                 totalFollowers: { type: integer }
 *                 limit: { type: integer }
 *                 offset: { type: integer }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:userId/followers', getFollowers);

/**
 * @openapi
 * /api/users/{userId}/following:
 *   get:
 *     tags: [Follow]
 *     summary: Lista de usuarios que sigue.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista de seguidos paginada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 following:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/UserSummary' }
 *                 totalFollowing: { type: integer }
 *                 limit: { type: integer }
 *                 offset: { type: integer }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:userId/following', getFollowing);

/**
 * @openapi
 * /api/users/{userId}/follow-stats:
 *   get:
 *     tags: [Follow]
 *     summary: Conteo de seguidores y seguidos del usuario.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Estadísticas de follow.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/FollowStats' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:userId/follow-stats', getFollowStats);

/**
 * @openapi
 * /api/users/{userId}:
 *   delete:
 *     tags: [Users]
 *     summary: Elimina la cuenta del usuario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Cuenta eliminada.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.delete('/:userId', verifyToken, deleteAccount);

export default router;
