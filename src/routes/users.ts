import express from 'express';

import { getUsers, getCheckUser, getUserAndBooks, deleteAccount } from "../controllers/userController";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

// Usuarios
router.get('/', getUsers);
router.get('/check-user/:userId', getCheckUser);
router.get('/:username/my-books/:userId', verifyToken, getUserAndBooks);
router.delete('/delete-account/:userId', deleteAccount);

export default router;
