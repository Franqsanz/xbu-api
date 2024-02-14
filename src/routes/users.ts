import express from 'express';

import { getUsers, getCheckUser, getUserAndBooks } from "../controllers/routes";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

// Usuarios
router.get('/', getUsers);
router.get('/check-user/:userId', getCheckUser);
router.get('/my-books/:username/:userId', verifyToken, getUserAndBooks);

export default router;
