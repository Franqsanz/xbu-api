import { BookRatingRepository } from '../repositories/bookRatingRepository';

export const BookRatingService = {
  async getRating(userId: string, bookId: string) {
    return await BookRatingRepository.getRating(userId, bookId);
  },

  async setRating(userId: string, bookId: string, rating: number) {
    return await BookRatingRepository.setRating(userId, bookId, rating);
  },

  async deleteRating(userId: string, bookId: string) {
    return await BookRatingRepository.deleteRating(userId, bookId);
  },

  async getStats(bookId: string) {
    return await BookRatingRepository.getStats(bookId);
  },
};
