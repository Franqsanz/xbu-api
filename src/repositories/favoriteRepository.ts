import favoritesModel from '../models/favorites';
import booksModel from '../models/books';
import { qyFindAllBookFavorite, qyPathUrlBooksFavorite, qyRemoveFavorite } from '../db/userQueries';
import { IFavoriteOperations } from '../types/repositories/IFavoriteRepository';

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
    // Dos pasos para evitar duplicados sin perder el `$position: 0` (más
    // reciente primero). `$push` no dedupea y `$addToSet` no soporta
    // `$position`, así que:
    //   1) upsert del doc del user si no existía (sin mutar `favoriteBooks`).
    //   2) push con filter compuesto `favoriteBooks: { $ne: id }` — solo se
    //      agrega si el libro aún no está.
    // Si ya estaba, devolvemos el doc actual (idempotente, no rompe la UI).
    await favoritesModel.updateOne(
      { userId },
      { $setOnInsert: { userId, favoriteBooks: [] } },
      { upsert: true }
    );
    const updated = await favoritesModel.findOneAndUpdate(
      { userId, favoriteBooks: { $ne: id } },
      { $push: { favoriteBooks: { $each: [id], $position: 0 } } },
      { new: true }
    );
    return (updated ?? (await favoritesModel.findOne({ userId }))) as any;
  },

  async removeFavorite(userId, id) {
    const query = qyRemoveFavorite(userId, id);
    return await favoritesModel.findOneAndUpdate(...query);
  },

  async deleteUserFavorites(userId) {
    const result = await favoritesModel.deleteOne({ userId: userId });
    return result.deletedCount > 0;
  },

  async removeBookRefsFromAll(bookIds) {
    if (bookIds.length === 0) return { modifiedCount: 0 };
    return await favoritesModel
      .updateMany(
        { favoriteBooks: { $in: bookIds } },
        { $pull: { favoriteBooks: { $in: bookIds } } }
      )
      .exec();
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
