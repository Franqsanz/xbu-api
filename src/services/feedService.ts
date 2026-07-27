import { FeedRepository } from '../repositories/feedRepository';

export const FeedService = {
  async getFeed(userId: string, cursor: { date: Date } | null, limit?: number) {
    return await FeedRepository.getFeed(userId, cursor, limit);
  },
};
