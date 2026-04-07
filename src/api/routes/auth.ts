import express, { Router } from 'express';

import { createUser, login, logoutUser, refreshSession } from '../controllers/auth/authController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router: Router = express.Router();

router.post('/register', authMiddleware, createUser);
router.post('/login', login);
router.post('/logout', authMiddleware, logoutUser);
router.post('/refresh', refreshSession);

export default router;
