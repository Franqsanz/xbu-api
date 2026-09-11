import { IFollowStats, IFollowData, IFollowingData, ISuggestedUser } from '../types';

export interface IFollowOperations {
  followUser(followerId: string, followingId: string): Promise<any>;
  unfollowUser(followerId: string, followingId: string): Promise<any>;
  isFollowing(followerId: string, followingId: string): Promise<any>;
  getFollowers(
    userId: string,
    limit?: number,
    offset?: number,
    currentUserId?: string | null
  ): Promise<IFollowData>;
  getFollowing(
    userId: string,
    limit?: number,
    offset?: number,
    currentUserId?: string | null
  ): Promise<IFollowingData>;
  getFollowStats(userId: string): Promise<IFollowStats>;
  getSuggestions(userId: string, limit?: number): Promise<ISuggestedUser[]>;
}
