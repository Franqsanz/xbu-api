import { CollectionRepository } from '../repositories/collectionRepository';

export const CollectionService = {
  async findAllCollections(userId: string) {
    try {
      return await CollectionRepository.findAllCollections(userId);
    } catch (err) {
      throw err;
    }
  },

  async saveCollections(userId: string, name: string) {
    try {
      return await CollectionRepository.createCollections(userId, name);
    } catch (err) {
      throw err;
    }
  },

  async findOneCollection(collectionId: string) {
    try {
      return await CollectionRepository.findOneCollection(collectionId);
    } catch (err) {
      throw err;
    }
  },

  async findCollectionsForUser(userId: string, bookId: string) {
    try {
      return await CollectionRepository.findCollectionsForUser(userId, bookId);
    } catch (err) {
      throw err;
    }
  },

  async updateCollectionName(userId: string, collectionId: string, name: string) {
    try {
      return await CollectionRepository.updateCollectionName(userId, collectionId, name);
    } catch (err) {
      throw err;
    }
  },

  async deleteCollections(userId: string, collectionId: string) {
    try {
      return await CollectionRepository.deleteCollections(userId, collectionId);
    } catch (err) {
      throw err;
    }
  },

  async deleteUserCollections(userId: string) {
    try {
      return await CollectionRepository.deleteUserCollections(userId);
    } catch (err) {
      throw err;
    }
  },

  async addBookToCollection(
    userId: string,
    collectionId: string[],
    bookId: string,
    checked: boolean
  ) {
    try {
      return await CollectionRepository.addBookToCollection(userId, collectionId, bookId, checked);
    } catch (err) {
      throw err;
    }
  },

  async removeBookFromCollection(userId: string, collectionId: string[], bookId: string) {
    try {
      return await CollectionRepository.removeBookFromCollection(userId, collectionId, bookId);
    } catch (err) {
      throw err;
    }
  },
};
