import express, { Router } from 'express';

import {
  getFindAllBookFavoriteByUser,
  patchToggleFavorite,
  deleteUserFavorites,
} from '../controllers/favoriteController';
import { pagination } from '../middlewares/pagination';

const router: Router = express.Router();

router.get('/:userId', pagination, getFindAllBookFavoriteByUser);
router.patch('/', patchToggleFavorite);
router.delete('/:userId', deleteUserFavorites);

export default router;
