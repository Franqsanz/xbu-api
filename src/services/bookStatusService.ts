import { BookStatusRepository } from '../repositories/bookStatusRepository';
import { IBookStatusOperations } from '../types/repositories/IBookStatusRepository';

export const BookStatusService: IBookStatusOperations = {
  async getStatus(userId, bookId) {
    return await BookStatusRepository.getStatus(userId, bookId);
  },

  async setStatus(userId, bookId, status) {
    return await BookStatusRepository.setStatus(userId, bookId, status);
  },

  async deleteStatus(userId, bookId) {
    return await BookStatusRepository.deleteStatus(userId, bookId);
  },

  async listByUserAndStatus(userId, status, limit, offset) {
    return await BookStatusRepository.listByUserAndStatus(userId, status, limit, offset);
  },
};
