import { BookStatusRepository } from '../repositories/bookStatusRepository';
import { IBookStatusOperations } from '../types/IRepository';

export const BookStatusService: IBookStatusOperations = {
  async getStatus(userId, bookId) {
    try {
      return await BookStatusRepository.getStatus(userId, bookId);
    } catch (err) {
      throw err;
    }
  },

  async setStatus(userId, bookId, status) {
    try {
      return await BookStatusRepository.setStatus(userId, bookId, status);
    } catch (err) {
      throw err;
    }
  },

  async deleteStatus(userId, bookId) {
    try {
      return await BookStatusRepository.deleteStatus(userId, bookId);
    } catch (err) {
      throw err;
    }
  },

  async listByUserAndStatus(userId, status, limit, offset) {
    try {
      return await BookStatusRepository.listByUserAndStatus(userId, status, limit, offset);
    } catch (err) {
      throw err;
    }
  },
};
