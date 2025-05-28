import collectionsModel from '../models/collections';
import {
  qyBooksByCollectionId,
  qyAddBookToCollection,
  qyRemoveBookFromCollection,
  qyUpdateCollectionName,
  qyGetCollectionsForUser,
} from '../db/userQueries';
import { ICollectionOperations } from '../types/IRepository';

export const CollectionRepository: ICollectionOperations = {
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

  async findCollectionsForUser(userId, bookId) {
    const query = qyGetCollectionsForUser(userId, bookId);
    const result = await collectionsModel.aggregate(query).exec();

    return result;
  },

  async updateCollectionName(userId, collectionId, name) {
    const query = qyUpdateCollectionName(userId, collectionId, name);

    return await collectionsModel.findOneAndUpdate(...query);
  },

  async addBookToCollection(userId, collectionId, bookId, checked = false) {
    const query = qyAddBookToCollection(userId, collectionId, bookId, checked);

    return await collectionsModel.findOneAndUpdate(...query);
  },

  async removeBookFromCollection(userId, collectionId, bookId) {
    const query = qyRemoveBookFromCollection(userId, collectionId, bookId);
    const result = await collectionsModel.findOneAndUpdate(...query);

    return result;
  },

  async deleteUserCollections(userId) {
    const result = await collectionsModel.deleteOne({ userId: userId });

    return result.deletedCount > 0;
  },
};
