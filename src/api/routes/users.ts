import express, { Router } from 'express';

import {
  getUsers,
  searchUsers,
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
  getCheckUsername,
  patchMe,
} from '../controllers/userController';
import { optionalAuth } from '../middlewares/optionalAuth';
import { mutationLimiter } from '../middlewares/rateLimit';
import {
  getBookStatus,
  setBookStatus,
  deleteBookStatus,
  getBooksByStatus,
} from '../controllers/bookStatusController';
import {
  getBookProgress,
  setBookProgress,
  deleteBookProgress,
} from '../controllers/bookProgressController';
import { verifyToken } from '../middlewares/verifyToken';
import { pagination } from '../middlewares/pagination';
import { upload } from '../middlewares/multer';

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
 * /api/users/search:
 *   get:
 *     tags: [Users]
 *     summary: Busca usuarios por nombre o username.
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         required: true
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 20, default: 10 }
 *     responses:
 *       200:
 *         description: Lista de usuarios coincidentes con isFollowing calculado si hay sesión.
 */
router.get('/search', optionalAuth, searchUsers);

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
 * /api/users/me:
 *   patch:
 *     tags: [Users]
 *     summary: Actualiza datos del perfil del usuario actual.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *               profile:
 *                 type: string
 *                 description: JSON stringify con { name?, username?, bio? }
 *     responses:
 *       200:
 *         description: Perfil actualizado.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/me', mutationLimiter, verifyToken, upload.single('image'), patchMe);

/**
 * @openapi
 * /api/users/check-username:
 *   get:
 *     tags: [Users]
 *     summary: Verifica si un username está disponible.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: u
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Resultado de la validación.
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - type: object
 *                   properties:
 *                     ok: { type: boolean, enum: [true] }
 *                 - type: object
 *                   properties:
 *                     ok: { type: boolean, enum: [false] }
 *                     reason: { type: string, enum: [format, reserved, taken] }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/check-username', verifyToken, getCheckUsername);

/**
 * @openapi
 * /api/users/me/feed:
 *   get:
 *     tags: [Feed]
 *     summary: Feed de actividad social paginado.
 *     description: |
 *       Devuelve la actividad cronológica de los usuarios que sigue el actual y la propia.
 *       Tipos: `book`, `comment`, `status`, `follow`, `favorite`, `collection`, `rating`.
 *
 *       Soporta paginación por cursor (default) y por página (`?page=N`). En modo
 *       page el feed hace fetch de hasta 500 items y aplica slice.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 30 }
 *     responses:
 *       200:
 *         description: Activities ordenadas por fecha desc.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 info:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/CursorInfo'
 *                     - $ref: '#/components/schemas/PageInfo'
 *                 activities:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/FeedActivity' }
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
 * /api/users/me/book-status:
 *   get:
 *     tags: [BookStatus]
 *     summary: Lista paginada de libros del usuario filtrados por estado de lectura.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: true
 *         schema: { type: string, enum: [read, reading, want_to_read] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Lista paginada de libros.
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/me/book-status', verifyToken, pagination, getBooksByStatus);

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
router.patch('/me/book-status/:bookId', mutationLimiter, verifyToken, setBookStatus);

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
router.delete('/me/book-status/:bookId', mutationLimiter, verifyToken, deleteBookStatus);

/**
 * @openapi
 * /api/users/me/book-progress/{bookId}:
 *   get:
 *     tags: [BookProgress]
 *     summary: Progreso de lectura del libro para el usuario actual.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progreso o null si no hay.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 progress:
 *                   nullable: true
 *                   type: object
 *                   properties:
 *                     position: {}
 *                     type: { type: string, enum: [pdf, epub] }
 *                     percentage: { type: number, nullable: true }
 *                     updatedAt: { type: string, format: date-time }
 *   patch:
 *     tags: [BookProgress]
 *     summary: Actualiza el progreso de lectura (upsert).
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
 *             required: [position, type]
 *             properties:
 *               position: {}
 *               type: { type: string, enum: [pdf, epub] }
 *               percentage: { type: number, minimum: 0, maximum: 100 }
 *     responses:
 *       200:
 *         description: Progreso actualizado.
 *   delete:
 *     tags: [BookProgress]
 *     summary: Elimina el progreso de lectura del libro.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Progreso eliminado.
 */
router.get('/me/book-progress/:bookId', verifyToken, getBookProgress);
router.patch('/me/book-progress/:bookId', verifyToken, setBookProgress);
router.delete('/me/book-progress/:bookId', verifyToken, deleteBookProgress);

/**
 * @openapi
 * /api/users/profile/{username}/books:
 *   get:
 *     tags: [Users]
 *     summary: Perfil y libros de un usuario por username.
 *     description: |
 *       Incluye `followersCount`, `followingCount`, `isFollowing`, `readCount`,
 *       `commentsCount`, `topCategories` y `booksStats`.
 *
 *       Soporta paginación por cursor (default) y por página (`?page=N`).
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: cursor
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10, maximum: 50 }
 *     responses:
 *       200:
 *         description: Perfil + libros publicados.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 info:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/CursorInfo'
 *                     - $ref: '#/components/schemas/PageInfo'
 *                 user: { $ref: '#/components/schemas/User' }
 *                 isFollowing: { type: boolean }
 *                 followersCount: { type: integer }
 *                 followingCount: { type: integer }
 *                 readCount: { type: integer }
 *                 commentsCount: { type: integer }
 *                 topCategories:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name: { type: string }
 *                       count: { type: integer }
 *                 booksStats:
 *                   type: object
 *                   properties:
 *                     totalViews: { type: integer }
 *                     mostViewed:
 *                       type: object
 *                       nullable: true
 *                     averageRating: { type: number }
 *                     ratingsCount: { type: integer }
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Book' }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/profile/:username/books', getUserAndBooksByUsername);

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
router.post('/follow/:targetUserId', mutationLimiter, verifyToken, followUser);

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
router.delete('/follow/:targetUserId', mutationLimiter, verifyToken, unfollowUser);

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
router.delete('/:userId', mutationLimiter, verifyToken, deleteAccount);

export default router;
