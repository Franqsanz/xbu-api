import express, { Router } from 'express';

import { createUser, login, logoutUser, refreshSession } from '../controllers/auth/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router: Router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un usuario (asigna username).
 *     description: Requiere sesión válida (cookie). Crea el perfil del usuario en la DB con el username elegido.
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username:
 *                 type: string
 *                 example: franquito
 *     responses:
 *       200:
 *         description: Usuario creado o ya existente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 existingUser:
 *                   $ref: '#/components/schemas/User'
 *                 saveUser:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/register', authMiddleware, createUser);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión con idToken de Firebase.
 *     description: Crea una session cookie firmada (httpOnly) que dura 5 días.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *                 description: ID Token de Firebase obtenido en el cliente.
 *     responses:
 *       200:
 *         description: Sesión iniciada. Setea cookie `_secure_tk`.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 auth:
 *                   type: boolean
 *                   example: true
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 */
router.post('/login', login);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cierra sesión.
 *     description: Revoca refresh tokens en Firebase y limpia la cookie de sesión.
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Logout exitoso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout exitoso
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/logout', authMiddleware, logoutUser);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Renueva la session cookie.
 *     description: Recibe un idToken fresco de Firebase y emite una nueva session cookie.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [idToken]
 *             properties:
 *               idToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión renovada.
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/refresh', refreshSession);

export default router;
