import followsModel from '../models/follows';
import usersModel from '../models/users';
import { IFollowData, IFollowingData, IFollowStats } from '../types/types';

async function findFollowingSet(
  currentUserId: string | null,
  candidateUids: string[]
): Promise<Set<string>> {
  if (!currentUserId || candidateUids.length === 0) return new Set();
  const docs = await followsModel
    .find({ follower: currentUserId, following: { $in: candidateUids } })
    .select('following')
    .lean()
    .exec();
  return new Set(docs.map((d: any) => d.following));
}

export const FollowRepository = {
  async followUser(followerId: string, followingId: string): Promise<any> {
    const newFollow = new followsModel({
      follower: followerId,
      following: followingId,
    });
    return await newFollow.save();
  },

  async unfollowUser(followerId: string, followingId: string): Promise<any> {
    return await followsModel.deleteOne({
      follower: followerId,
      following: followingId,
    });
  },

  async isFollowing(followerId: string, followingId: string): Promise<any> {
    return await followsModel.findOne({
      follower: followerId,
      following: followingId,
    });
  },

  async getFollowers(
    userId: string,
    limit: number = 10,
    offset: number = 0,
    currentUserId: string | null = null
  ): Promise<IFollowData> {
    const totalFollowers = await followsModel.countDocuments({
      following: userId,
    });

    const followerRecords = await followsModel
      .find({ following: userId })
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const followerUids = followerRecords.map((f: any) => f.follower);
    const users = await usersModel
      .find({ uid: { $in: followerUids } }, 'uid username name picture')
      .lean()
      .exec();

    const followingSet = await findFollowingSet(currentUserId, followerUids);
    const followers = users.map((u: any) => ({
      ...u,
      isFollowing: followingSet.has(u.uid),
    }));

    return {
      followers,
      totalFollowers,
    };
  },

  async getFollowing(
    userId: string,
    limit: number = 10,
    offset: number = 0,
    currentUserId: string | null = null
  ): Promise<IFollowingData> {
    const totalFollowing = await followsModel.countDocuments({
      follower: userId,
    });

    const followingRecords = await followsModel
      .find({ follower: userId })
      .skip(offset)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    const followingUids = followingRecords.map((f: any) => f.following);
    const users = await usersModel
      .find({ uid: { $in: followingUids } }, 'uid username name picture')
      .lean()
      .exec();

    const followingSet = await findFollowingSet(currentUserId, followingUids);
    const following = users.map((u: any) => ({
      ...u,
      isFollowing: followingSet.has(u.uid),
    }));

    return {
      following,
      totalFollowing,
    };
  },

  async getFollowStats(userId: string): Promise<IFollowStats> {
    const followersCount = await followsModel.countDocuments({
      following: userId,
    });

    const followingCount = await followsModel.countDocuments({
      follower: userId,
    });

    return {
      followersCount,
      followingCount,
    };
  },

  async deleteUserFollows(userId: string): Promise<any> {
    // Eliminar donde el usuario es seguidor
    await followsModel.deleteMany({ follower: userId });
    // Eliminar donde el usuario es seguido
    return await followsModel.deleteMany({ following: userId });
  },
};
