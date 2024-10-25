import booksModel from '../models/books';
import usersModel from '../models/users';
import favoritesModel from '../models/favorites';
import collectionsModel from '../models/collections';
import { qyCheckUser } from '../db/userQueries';
import { IRepositoryUser } from '../types/IRepository';
import { qyFindAllBookFavorite } from '../db/bookQueries';

export const UserRepository: IRepositoryUser = {
  async findUsers() {
    return await usersModel.find();
  },

  async findById(userId) {
    const { query, projection } = qyCheckUser(userId);

    return await usersModel.findOne(query, projection);
  },

  async findByUid(uid) {
    return await usersModel.findOne({
      uid,
    });
  },

  async findUserAndBooks(username, limit, offset) {
    const user = await usersModel.findOne({ username: username }, 'uid name picture createdAt');

    const totalBooks = await booksModel.countDocuments({
      userId: user?.uid,
    });

    const results = await booksModel
      .find({ userId: user?.uid }, 'title category language authors pathUrl image')
      .skip(offset)
      .limit(limit)
      .sort({ _id: -1 })
      .exec();

    return {
      user,
      results,
      totalBooks,
    };
  },

  // Busca todos los libros de un usuario
  async findBooksByUserId(userId) {
    return await booksModel.find({
      userId,
    });
  },

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

  async findAllCollections(userId) {
    const userCollections = await collectionsModel.findOne({ userId });

    if (!userCollections) {
      return { userId, collections: [], collectionCount: 0 };
    }

    const collections = userCollections.collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      books: collection.books,
      createdAt: collection.createdAt,
    }));

    const totalCollections = collections.length;

    return {
      userId: userCollections.userId,
      id: userCollections.id,
      totalCollections,
      collections,
    };
  },

  async createCollections(userId, name) {
    const userCollections = await collectionsModel.findOne({ userId });

    if (userCollections) {
      userCollections.collections.push({ name: name, books: [] });

      return await userCollections.save();
    } else {
      const newCollections = new collectionsModel({
        userId,
        collections: [{ name: name }],
      });

      return await newCollections.save();
    }
  },

  async deleteCollections(userId, collectionId) {
    return await collectionsModel.updateOne(
      { userId },
      { $pull: { collections: { _id: collectionId } } }
    );
  },

  async createUser(userToSave) {
    const newUser = new usersModel(userToSave);

    return await newUser.save();
  },

  async deleteUserBooks(id) {
    return await booksModel.deleteOne(id);
  },

  async deleteUser(userId) {
    return await usersModel.deleteOne(userId);
  },
};
