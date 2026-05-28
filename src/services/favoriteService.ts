import { FavoriteRepository } from '../repositories/favoriteRepository';
import { ActivityLogService } from './activityLogService';
import { IFavoriteOperations } from '../types/repositories/IFavoriteRepository';

export const FavoriteService: IFavoriteOperations = {
  async findAllBookFavoriteByUser(userId, limit, offset) {
    return await FavoriteRepository.findAllBookFavoriteByUser(userId, limit, offset);
  },

  async findBySlugFavorite(pathUrl, userId) {
    return await FavoriteRepository.findBySlugFavorite(pathUrl, userId);
  },

  async addFavorite(userId, id) {
    const result = await FavoriteRepository.addFavorite(userId, id);
    if (result) {
      await ActivityLogService.record(userId, 'favorite', id);
    }
    return result;
  },

  async removeFavorite(userId, id) {
    const result = await FavoriteRepository.removeFavorite(userId, id);
    if (result) {
      await ActivityLogService.remove(userId, 'favorite', id);
    }
    return result;
  },

  async deleteUserFavorites(userId) {
    return await FavoriteRepository.deleteUserFavorites(userId);
  },

  async removeBookRefsFromAll(bookIds) {
    return await FavoriteRepository.removeBookRefsFromAll(bookIds);
  },
};
