import { IFollowStats, IFollowData, IFollowingData } from '../types';

export interface IFollowOperations {
  followUser(followerId: string, followingId: string): Promise<any>;
  unfollowUser(followerId: string, followingId: string): Promise<any>;
  isFollowing(followerId: string, followingId: string): Promise<any>;
  getFollowers(userId: string, limit?: number, offset?: number): Promise<IFollowData>;
  getFollowing(userId: string, limit?: number, offset?: number): Promise<IFollowingData>;
  getFollowStats(userId: string): Promise<IFollowStats>;
}
