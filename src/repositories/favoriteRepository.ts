import favoritesModel from '../models/favorites';
import booksModel from '../models/books';
import {
  qyAddFavorite,
  qyFindAllBookFavorite,
  qyPathUrlBooksFavorite,
  qyRemoveFavorite,
} from '../db/userQueries';
import { IFavoriteOperations } from '../types/IRepository';

export const FavoriteRepository: IFavoriteOperations = {
  async findAllBookFavoriteByUser(userId, limit, offset) {
    const query = qyFindAllBookFavorite(userId, limit, offset);
    const [result] = await favoritesModel.aggregate(query).exec();

    const missingBooks = result.missingBooks;
    // Verifica si hay libros eliminados en el resultado
    if (missingBooks && missingBooks.length > 0) {
      // Si hay libros eliminados, los eliminamos de la lista de favoritos
      await favoritesModel.updateMany(
        { userId }, // Encuentra el documento por el userId
        {
          $pull: {
            favoriteBooks: { $in: missingBooks }, // Elimina los libros que están en missingBooks
          },
        }
      );
    }

    return {
      totalBooks: result.totalBooks,
      results: result.results,
    };
  },

  async addFavorite(userId, id) {
    const query = qyAddFavorite(userId, id);
    return await favoritesModel.findOneAndUpdate(...query);
  },

  async removeFavorite(userId, id) {
    const query = qyRemoveFavorite(userId, id);
    return await favoritesModel.findOneAndUpdate(...query);
  },

  async deleteUserFavorites(userId) {
    const result = await favoritesModel.deleteOne({ userId: userId });
    return result.deletedCount > 0;
  },

  async findBySlugFavorite(slug, userId) {
    if (!userId) return null;

    const book = await booksModel.findOne({ pathUrl: slug });
    if (!book) return null;

    const favorite = await favoritesModel.findOne({
      userId,
      favoriteBooks: book._id,
    });

    return favorite ? [book] : null;
  },
};
