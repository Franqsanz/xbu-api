import followsModel from '../models/follows';
import usersModel from '../models/users';
import booksModel from '../models/books';
import { IFollowData, IFollowingData, IFollowStats, ISuggestedUser } from '../types/types';

export async function findFollowingSet(
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

  /**
   * A quién seguir: primero la gente que siguen los que yo sigo, ordenada por
   * cuántos de mis seguidos la siguen (segundo grado). Si no alcanza para
   * llenar el cupo, completamos con quienes más libros publicaron.
   */
  async getSuggestions(userId: string, limit: number = 5): Promise<ISuggestedUser[]> {
    const followingRecords = await followsModel
      .find({ follower: userId })
      .select('following')
      .lean()
      .exec();

    const followingUids = followingRecords.map((f: any) => f.following);
    // Nunca sugerimos al propio usuario ni a quien ya sigue.
    const excluded = new Set<string>([userId, ...followingUids]);
    const candidateUids: string[] = [];

    // Juntamos más candidatos que el cupo a propósito: recortamos recién después
    // de resolverlos contra `users`, así un uid que no corresponde a ningún
    // usuario real (libros viejos sin `userId`) no se queda con un lugar.
    const addCandidate = (uid: unknown) => {
      if (typeof uid !== 'string' || uid.length === 0) return;
      if (excluded.has(uid) || candidateUids.includes(uid)) return;
      candidateUids.push(uid);
    };

    if (followingUids.length > 0) {
      const secondDegree = await followsModel.aggregate([
        { $match: { follower: { $in: followingUids } } },
        { $group: { _id: '$following', score: { $sum: 1 } } },
        { $sort: { score: -1 } },
        { $limit: limit + excluded.size },
      ]);

      secondDegree.forEach((row: any) => addCandidate(row._id));
    }

    if (candidateUids.length < limit) {
      const topPublishers = await booksModel.aggregate([
        { $match: { userId: { $nin: [null, ''] } } },
        { $group: { _id: '$userId', total: { $sum: 1 } } },
        { $sort: { total: -1 } },
        { $limit: limit + excluded.size },
      ]);

      topPublishers.forEach((row: any) => addCandidate(row._id));
    }

    // Último recurso: los más nuevos. En una comunidad chica la mayoría todavía
    // no publicó nada, y sin esto nunca aparecerían como sugerencia.
    if (candidateUids.length < limit) {
      const recentUsers = await usersModel
        .find({ uid: { $nin: Array.from(excluded) } }, 'uid')
        .sort({ createdAt: -1 })
        .limit(limit + candidateUids.length)
        .lean()
        .exec();

      recentUsers.forEach((u: any) => addCandidate(u.uid));
    }

    if (candidateUids.length === 0) return [];

    const users = await usersModel
      .find({ uid: { $in: candidateUids } }, 'uid username name picture bio')
      .lean()
      .exec();

    // `$in` devuelve en orden de índice, no en el del array: reordenamos por ranking.
    const userByUid = new Map(users.map((u: any) => [u.uid, u]));
    return candidateUids
      .map((uid) => userByUid.get(uid))
      .filter(Boolean)
      .slice(0, limit) as unknown as ISuggestedUser[];
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
