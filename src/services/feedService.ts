import { FeedRepository } from '../repositories/feedRepository';

export const FeedService = {
  async getFeed(userId: string, limit?: number, offset?: number) {
    return await FeedRepository.getFeed(userId, limit, offset);
  },
};
