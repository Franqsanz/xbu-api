import { UserRepository } from './../repositories/userRepository';
import { FollowRepository } from './../repositories/followRepository';
import { CollectionRepository } from './../repositories/collectionRepository';
import { FavoriteRepository } from './../repositories/favoriteRepository';
import { commentRepository } from './../repositories/commetRepository';
import { cloudinary } from '../config/cloudinary';
import { authFirebase } from '../config/firebase';
import { IFullRepositoryUser } from '../types/IRepository';
import { IFollowData, IFollowingData, IFollowStats } from '../types/types';

export const UserService: IFullRepositoryUser = {
  async findUsers() {
    try {
      return await UserRepository.findUsers();
    } catch (err) {
      throw err;
    }
  },

  async findById(userId) {
    try {
      return await UserRepository.findById(userId);
    } catch (err) {
      throw err;
    }
  },

  async findUserAndBooks(username, limit, offset) {
    try {
      return await UserRepository.findUserAndBooks(username, limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async saveUser(decodedToken, username) {
    const userToSave = {
      ...decodedToken,
      username: username,
      createdAt: new Date(),
    };

    try {
      const existingUser = await UserRepository.findByUid!(decodedToken.uid);
      const saveUser = await UserRepository.createUser(userToSave);

      return {
        existingUser,
        saveUser,
      };
    } catch (err) {
      throw err;
    }
  },

  async deleteAccount(userId) {
    try {
      const user = await UserRepository.findById(userId);
      const books = await UserRepository.findBooksByUserId!(userId);

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Eliminar todas las imágenes de libros de Cloudinary
      for (let book of books) {
        const public_id = book.image.public_id;
        await cloudinary.uploader.destroy(public_id);
      }

      await UserRepository.deleteUserBooks(userId);
      await commentRepository.deleteAllByUserId(userId);
      await CollectionRepository.deleteUserCollections(userId);
      await FavoriteRepository.deleteUserFavorites(userId);
      await FollowRepository.deleteUserFollows(userId);
      await authFirebase.deleteUser(user.uid);

      return await UserRepository.deleteUser(user?.uid);
    } catch (err) {
      throw err;
    }
  },

  async followUser(followerId: string, followingId: string): Promise<any> {
    try {
      return await FollowRepository.followUser(followerId, followingId);
    } catch (err) {
      throw err;
    }
  },

  async unfollowUser(followerId: string, followingId: string): Promise<any> {
    try {
      return await FollowRepository.unfollowUser(followerId, followingId);
    } catch (err) {
      throw err;
    }
  },

  async isFollowing(followerId: string, followingId: string): Promise<any> {
    try {
      return await FollowRepository.isFollowing(followerId, followingId);
    } catch (err) {
      throw err;
    }
  },

  async getFollowers(userId: string, limit: number = 10, offset: number = 0): Promise<IFollowData> {
    try {
      return await FollowRepository.getFollowers(userId, limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async getFollowing(
    userId: string,
    limit: number = 10,
    offset: number = 0
  ): Promise<IFollowingData> {
    try {
      return await FollowRepository.getFollowing(userId, limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async getFollowStats(userId: string): Promise<IFollowStats> {
    try {
      return await FollowRepository.getFollowStats(userId);
    } catch (err) {
      throw err;
    }
  },
};
