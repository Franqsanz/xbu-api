import express, { Router } from 'express';

import { createUser, logoutUser } from '../controllers/auth/authController';

const router: Router = express.Router();

router.post('/register', createUser);
router.post('/logout', logoutUser);

export default router;
