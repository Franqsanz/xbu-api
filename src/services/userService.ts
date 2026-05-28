import { UserRepository } from './../repositories/userRepository';
import { FollowRepository } from './../repositories/followRepository';
import { CollectionRepository } from './../repositories/collectionRepository';
import { FavoriteRepository } from './../repositories/favoriteRepository';
import { commentRepository } from './../repositories/commentRepository';
import { cloudinary } from '../config/cloudinary';
import { authFirebase } from '../config/firebase';
import { IFullRepositoryUser } from '../types/repositories/IUserRepository';
import { IFollowData, IFollowingData, IFollowStats } from '../types/types';

export const UserService: IFullRepositoryUser = {
  async findUsers() {
    return await UserRepository.findUsers();
  },

  async findById(userId) {
    return await UserRepository.findById(userId);
  },

  async findUserAndBooks(username, limit, offset) {
    return await UserRepository.findUserAndBooks(username, limit, offset);
  },

  async findUserByUsernameAndBooks(username, limit, offset) {
    return await UserRepository.findUserByUsernameAndBooks(username, limit, offset);
  },

  async saveUser(decodedToken, username) {
    const userToSave = {
      ...decodedToken,
      username: username,
      createdAt: new Date(),
    };

    const existingUser = await UserRepository.findByUid!(decodedToken.uid);
    const saveUser = await UserRepository.createUser(userToSave);

    return { existingUser, saveUser };
  },

  async deleteAccount(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const books = await UserRepository.findBooksByUserId!(userId);

    // Eliminar imágenes de libros de Cloudinary
    for (const book of books) {
      await cloudinary.uploader.destroy(book.image.public_id);
    }

    await UserRepository.deleteUserBooks(userId);
    await commentRepository.deleteAllByUserId(userId);
    await CollectionRepository.deleteUserCollections(userId);
    await FavoriteRepository.deleteUserFavorites(userId);
    await FollowRepository.deleteUserFollows(userId);
    await authFirebase.deleteUser(user.uid);

    return await UserRepository.deleteUser(user.uid);
  },

  async followUser(followerId: string, followingId: string): Promise<any> {
    return await FollowRepository.followUser(followerId, followingId);
  },

  async unfollowUser(followerId: string, followingId: string): Promise<any> {
    return await FollowRepository.unfollowUser(followerId, followingId);
  },

  async isFollowing(followerId: string, followingId: string): Promise<any> {
    return await FollowRepository.isFollowing(followerId, followingId);
  },

  async getFollowers(userId: string, limit = 10, offset = 0): Promise<IFollowData> {
    return await FollowRepository.getFollowers(userId, limit, offset);
  },

  async getFollowing(userId: string, limit = 10, offset = 0): Promise<IFollowingData> {
    return await FollowRepository.getFollowing(userId, limit, offset);
  },

  async getFollowStats(userId: string): Promise<IFollowStats> {
    return await FollowRepository.getFollowStats(userId);
  },
};
