import { FavoriteRepository } from '../repositories/favoriteRepository';
import { IFavoriteOperations } from '../types/IRepository';

export const FavoriteService: IFavoriteOperations = {
  async findAllBookFavoriteByUser(userId, limit, offset) {
    try {
      return await FavoriteRepository.findAllBookFavoriteByUser(userId, limit, offset);
    } catch (error) {
      throw error;
    }
  },

  async findBySlugFavorite(pathUrl, userId) {
    try {
      return await FavoriteRepository.findBySlugFavorite(pathUrl, userId);
    } catch (err) {
      throw err;
    }
  },

  async addFavorite(userId, id) {
    try {
      return await FavoriteRepository.addFavorite(userId, id);
    } catch (err) {
      throw err;
    }
  },

  async removeFavorite(userId, id) {
    try {
      return await FavoriteRepository.removeFavorite(userId, id);
    } catch (err) {
      throw err;
    }
  },

  async deleteUserFavorites(userId) {
    try {
      return await FavoriteRepository.deleteUserFavorites(userId);
    } catch (err) {
      throw err;
    }
  },
};
