import booksModel from '../models/books';
import usersModel from '../models/users';
import favoritesModel from '../models/favorites';
import collectionsModel from '../models/collections';
import {
  qyCheckUser,
  qyAddFavorite,
  qyFindAllBookFavorite,
  qyRemoveFavorite,
  qyBooksByCollectionId,
  qyAddBookToCollection,
  qyRemoveBookFromCollection,
  qyUpdateCollectionName,
  qyGetCollectionsForUser,
} from '../db/userQueries';
import { IRepositoryUser } from '../types/IRepository';
// import { PipelineStage, Types } from 'mongoose';

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

  async addFavorite(userId, id) {
    const query = qyAddFavorite(userId, id);

    return await favoritesModel.findOneAndUpdate(...query);
  },

  async removeFavorite(userId, id) {
    const query = qyRemoveFavorite(userId, id);

    return await favoritesModel.findOneAndUpdate(...query);
  },

  async findAllCollections(userId) {
    const userCollections = await collectionsModel.findOne({ userId });

    if (!userCollections) {
      return { userId, collections: [], collectionCount: 0 };
    }

    const collections = userCollections.collections
      .map((collection) => ({
        id: collection.id,
        name: collection.name,
        createdAt: collection.createdAt || new Date(0), // Usar fecha mínima si es undefined
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalCollections = collections.length;

    return {
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

  async findOneCollection(collectionId) {
    const query = qyBooksByCollectionId(collectionId);
    const [result] = await collectionsModel.aggregate(query).exec();
    const missingBooks = result.missingBooks;

    if (missingBooks && missingBooks.length > 0) {
      // Si hay libros eliminados, los eliminamos de la colección
      await collectionsModel.updateMany(
        { collectionId }, // Encuentra el documento por el collectionId
        {
          $pull: {
            books: { $in: missingBooks }, // Elimina los libros que están en missingBooks
          },
        }
      );
    }

    return result.results || null;
  },

  async findCollectionsForUser(userId: string, bookId: string) {
    const query = qyGetCollectionsForUser(userId, bookId);
    const result = await collectionsModel.aggregate(query).exec();

    return result;
  },

  async updateCollectionName(userId: string, collectionId: string, name: string) {
    const query = qyUpdateCollectionName(userId, collectionId, name);

    return await collectionsModel.findOneAndUpdate(...query);
  },

  async addBookToCollection(
    userId: string,
    collectionId: string[],
    bookId: string,
    checked: boolean = false
  ) {
    const query = qyAddBookToCollection(userId, collectionId, bookId, checked);

    return await collectionsModel.findOneAndUpdate(...query);
  },

  async removeBookFromCollection(
    userId: string,
    collectionId: string[],
    bookId: string
    // checked: boolean = false
  ) {
    const query = qyRemoveBookFromCollection(userId, collectionId, bookId);
    const result = await collectionsModel.findOneAndUpdate(...query);

    // Verificar si el libro todavía existe en la colección
    // const stillExists = await collectionsModel.findOne({
    //   userId,
    //   'collections._id': { $in: collectionId.map((id) => new Types.ObjectId(id)) },
    //   'collections.books.bookId': new Types.ObjectId(bookId),
    // });

    // if (stillExists) {
    //   throw new Error(
    //     'El libro no se encuentra en la colección especificada o no pertenece al usuario.'
    //   );
    // }

    return result;
  },

  async createUser(userToSave) {
    const newUser = new usersModel(userToSave);

    return await newUser.save();
  },

  async deleteUserBooks(id) {
    return await booksModel.deleteOne(id);
  },

  async deleteUserFavorites(userId) {
    const result = await favoritesModel.deleteOne({ userId: userId });

    return result.deletedCount > 0;
  },

  async deleteUserCollections(userId) {
    const result = await collectionsModel.deleteOne({ userId: userId });

    return result.deletedCount > 0;
  },

  async deleteUser(userId) {
    return await usersModel.deleteOne(userId);
  },
};
