import express, { Router } from 'express';

import {
  create,
  update,
  findAll,
  findReplies,
  findByUserId,
  deleteComment,
  addReaction,
  findStats,
} from '../controllers/commentController';
import { query } from '../middlewares/query';
import { pagination } from '../middlewares/pagination';
import { authMiddleware } from '../middlewares/authMiddleware';

const router: Router = express.Router();

/**
 * @openapi
 * /api/users/comments/book-comments/{bookId}:
 *   get:
 *     tags: [Comments]
 *     summary: Lista paginada de comentarios de un libro.
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 5 }
 *     responses:
 *       200:
 *         description: Comentarios del libro.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 info: { $ref: '#/components/schemas/Info' }
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Comment' }
 */
router.get('/book-comments/:bookId', findAll);

/**
 * @openapi
 * /api/users/comments/comment/{commentId}/replies:
 *   get:
 *     tags: [Comments]
 *     summary: Lista las respuestas a un comentario.
 *     parameters:
 *       - in: path
 *         name: commentId
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
 *         description: Respuestas al comentario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 results:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Comment' }
 *                 total: { type: integer }
 */
router.get('/comment/:commentId/replies', findReplies);

/**
 * @openapi
 * /api/users/comments/user-comments/{userId}:
 *   get:
 *     tags: [Comments]
 *     summary: Comentarios escritos por un usuario.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Lista de comentarios del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Comment' }
 */
router.get('/user-comments/:userId', findByUserId);

/**
 * @openapi
 * /api/users/comments/comment/stats/{bookId}:
 *   get:
 *     tags: [Comments]
 *     summary: Estadísticas agregadas de comentarios del libro.
 *     parameters:
 *       - in: path
 *         name: bookId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Conteos y métricas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalComments: { type: integer }
 *                 totalLikes: { type: integer }
 *                 totalDislikes: { type: integer }
 */
router.get('/comment/stats/:bookId', findStats);

/**
 * @openapi
 * /api/users/comments/comment:
 *   post:
 *     tags: [Comments]
 *     summary: Crea un comentario o una respuesta en un libro.
 *     description: |
 *       Si `parentId` no viene, se crea un comentario top-level y se dispara
 *       una notificación tipo `comment` al autor del libro. Si `parentId`
 *       viene, se crea una respuesta al comentario padre (que debe ser
 *       top-level), se incrementa `repliesCount` del padre y se dispara una
 *       notificación tipo `reply` al autor del comentario padre. `replyToId`
 *       es opcional y sirve solo a la UI para indicar a qué respuesta puntual
 *       se está contestando; el hilo lógico sigue siendo `parentId`.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [text, author, bookId]
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 1500
 *               bookId: { type: string }
 *               parentId:
 *                 type: string
 *                 nullable: true
 *                 description: Id del comentario top-level al que responde. Omitir para crear top-level.
 *               replyToId:
 *                 type: string
 *                 nullable: true
 *                 description: Id de la respuesta puntual dentro del hilo (opcional, solo UI).
 *               author:
 *                 type: object
 *                 required: [userId]
 *                 properties:
 *                   userId: { type: string }
 *                   name: { type: string }
 *                   username: { type: string }
 *                   avatar: { type: string }
 *     responses:
 *       201:
 *         description: Comentario o respuesta creado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Comment' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/comment', authMiddleware, create);

/**
 * @openapi
 * /api/users/comments/comment/{commentId}/{userId}:
 *   patch:
 *     tags: [Comments]
 *     summary: Edita un comentario propio.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
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
 *             required: [text]
 *             properties:
 *               text:
 *                 type: string
 *                 maxLength: 1500
 *     responses:
 *       200:
 *         description: Comentario actualizado.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/comment/:commentId/:userId', authMiddleware, update);

/**
 * @openapi
 * /api/users/comments/comment/{commentId}/{userId}:
 *   delete:
 *     tags: [Comments]
 *     summary: Elimina un comentario propio.
 *     description: |
 *       Si el comentario es top-level, se eliminan también todas sus
 *       respuestas en cascada. Si es una respuesta, se decrementa
 *       `repliesCount` del padre.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Comentario eliminado.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/comment/:commentId/:userId', authMiddleware, deleteComment);

/**
 * @openapi
 * /api/users/comments/comment/{commentId}/{userId}/reaction:
 *   post:
 *     tags: [Comments]
 *     summary: Reacciona (like / dislike) a un comentario.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: commentId
 *         required: true
 *         schema: { type: string }
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
 *             required: [type]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [like, dislike]
 *     responses:
 *       200:
 *         description: Reacción aplicada.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/comment/:commentId/:userId/reaction', authMiddleware, addReaction);

export default router;
