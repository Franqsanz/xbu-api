import followsModel from '../models/follows';
import usersModel from '../models/users';
import { IFollowData, IFollowingData, IFollowStats } from '../types/types';

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

  async getFollowers(userId: string, limit: number = 10, offset: number = 0): Promise<IFollowData> {
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
    const followers = await usersModel.find(
      { uid: { $in: followerUids } },
      'uid username name picture'
    );

    return {
      followers,
      totalFollowers,
    };
  },

  async getFollowing(
    userId: string,
    limit: number = 10,
    offset: number = 0
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
    const following = await usersModel.find(
      { uid: { $in: followingUids } },
      'uid username name picture'
    );

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
