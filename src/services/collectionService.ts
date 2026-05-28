import { CollectionRepository } from '../repositories/collectionRepository';
import { ActivityLogService } from './activityLogService';
import { ICollectionOperations } from '../types/repositories/ICollectionRepository';

interface ICollectionService extends ICollectionOperations {
  syncBookActivity(userId: string, bookId: string): Promise<void>;
}

export const CollectionService: ICollectionService = {
  async findAllCollections(userId) {
    return await CollectionRepository.findAllCollections(userId);
  },

  async saveCollections(userId, name) {
    return await CollectionRepository.createCollections!(userId, name);
  },

  async findOneCollection(collectionId) {
    return await CollectionRepository.findOneCollection(collectionId);
  },

  async findCollectionsForUser(userId, bookId) {
    return await CollectionRepository.findCollectionsForUser(userId, bookId);
  },

  async updateCollectionName(userId, collectionId, name) {
    return await CollectionRepository.updateCollectionName(userId, collectionId, name);
  },

  async deleteCollections(userId, collectionId) {
    return await CollectionRepository.deleteCollections(userId, collectionId);
  },

  async deleteUserCollections(userId) {
    return await CollectionRepository.deleteUserCollections(userId);
  },

  async removeBookRefsFromAll(bookIds) {
    return await CollectionRepository.removeBookRefsFromAll(bookIds);
  },

  async addBookToCollection(userId, collectionId, bookId, checked) {
    return await CollectionRepository.addBookToCollection(userId, collectionId, bookId, checked);
  },

  async removeBookFromCollection(userId, collectionId, bookId) {
    return await CollectionRepository.removeBookFromCollection(userId, collectionId, bookId);
  },

  async isBookInAnyCollection(userId, bookId) {
    return await CollectionRepository.isBookInAnyCollection(userId, bookId);
  },

  /**
   * Sincroniza el activity log: si el libro sigue en alguna colección,
   * registra/mantiene el evento. Si no, lo elimina. Llamar después
   * de cualquier toggle/remove para mantener consistente el feed.
   */
  async syncBookActivity(userId: string, bookId: string) {
    const stillInAny = await CollectionRepository.isBookInAnyCollection(userId, bookId);
    if (stillInAny) {
      await ActivityLogService.record(userId, 'collection', bookId);
    } else {
      await ActivityLogService.remove(userId, 'collection', bookId);
    }
  },
};
