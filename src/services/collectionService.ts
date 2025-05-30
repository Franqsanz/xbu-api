import { CollectionRepository } from '../repositories/collectionRepository';
import { ICollectionOperations } from '../types/IRepository';

export const CollectionService: ICollectionOperations = {
  async findAllCollections(userId) {
    try {
      return await CollectionRepository.findAllCollections(userId);
    } catch (err) {
      throw err;
    }
  },

  async saveCollections(userId, name) {
    try {
      return await CollectionRepository.createCollections!(userId, name);
    } catch (err) {
      throw err;
    }
  },

  async findOneCollection(collectionId) {
    try {
      return await CollectionRepository.findOneCollection(collectionId);
    } catch (err) {
      throw err;
    }
  },

  async findCollectionsForUser(userId, bookId) {
    try {
      return await CollectionRepository.findCollectionsForUser(userId, bookId);
    } catch (err) {
      throw err;
    }
  },

  async updateCollectionName(userId, collectionId, name) {
    try {
      return await CollectionRepository.updateCollectionName(userId, collectionId, name);
    } catch (err) {
      throw err;
    }
  },

  async deleteCollections(userId, collectionId) {
    try {
      return await CollectionRepository.deleteCollections(userId, collectionId);
    } catch (err) {
      throw err;
    }
  },

  async deleteUserCollections(userId) {
    try {
      return await CollectionRepository.deleteUserCollections(userId);
    } catch (err) {
      throw err;
    }
  },

  async addBookToCollection(userId, collectionId, bookId, checked) {
    try {
      return await CollectionRepository.addBookToCollection(userId, collectionId, bookId, checked);
    } catch (err) {
      throw err;
    }
  },

  async removeBookFromCollection(userId, collectionId, bookId) {
    try {
      return await CollectionRepository.removeBookFromCollection(userId, collectionId, bookId);
    } catch (err) {
      throw err;
    }
  },
};
