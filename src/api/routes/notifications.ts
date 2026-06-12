import express, { Router } from 'express';

import {
  listNotifications,
  getUnreadCount,
  markRead,
  setReadStatus,
  deleteNotification,
  markAllRead,
} from '../controllers/notificationController';
import { verifyToken } from '../middlewares/verifyToken';

const router: Router = express.Router();

/**
 * @openapi
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Lista paginada de notificaciones del usuario autenticado.
 *     description: |
 *       Devuelve las notificaciones del usuario en orden cronológico descendente
 *       (más recientes primero). Cada item viene enriquecido con `actor` (el
 *       usuario que disparó la acción) y `book` (si la notificación está
 *       asociada a un libro). Tipos posibles: `follow`, `comment`, `rating`.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: offset
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200:
 *         description: Lista de notificaciones con paginación.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 notifications:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Notification' }
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
router.get('/', verifyToken, listNotifications);

/**
 * @openapi
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Cantidad de notificaciones no leídas del usuario.
 *     description: |
 *       Endpoint liviano pensado para polling. El frontend lo consulta cada
 *       30 segundos para actualizar el badge del icono de notificaciones.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Conteo de no leídas.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/unread-count', verifyToken, getUnreadCount);

/**
 * @openapi
 * /api/notifications/mark-all-read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marca todas las notificaciones del usuario como leídas.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Todas las notificaciones marcadas como leídas.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.patch('/mark-all-read', verifyToken, markAllRead);

/**
 * @openapi
 * /api/notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Marca una notificación específica como leída.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notificación marcada como leída.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:notificationId/read', verifyToken, markRead);

/**
 * @openapi
 * /api/notifications/{notificationId}/status:
 *   patch:
 *     tags: [Notifications]
 *     summary: Cambia el estado de lectura de una notificación (toggle leído/no leído).
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [read]
 *             properties:
 *               read: { type: boolean }
 *     responses:
 *       200:
 *         description: Estado actualizado.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch('/:notificationId/status', verifyToken, setReadStatus);

/**
 * @openapi
 * /api/notifications/{notificationId}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Elimina una notificación.
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notificación eliminada.
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Success' }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete('/:notificationId', verifyToken, deleteNotification);

export default router;
