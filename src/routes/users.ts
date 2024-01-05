import express from 'express';

import { getUserAndBooks } from "../controllers/routes";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();

// perfil
router.get('/my-books/:userId', verifyToken, getUserAndBooks);

export default router;
