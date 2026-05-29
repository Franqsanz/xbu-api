import { UserRepository } from './../repositories/userRepository';
import { FollowRepository } from './../repositories/followRepository';
import { CollectionRepository } from './../repositories/collectionRepository';
import { FavoriteRepository } from './../repositories/favoriteRepository';
import { commentRepository } from './../repositories/commentRepository';
import { BookStatusRepository } from './../repositories/bookStatusRepository';
import { ActivityLogRepository } from './../repositories/activityLogRepository';
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
    const bookIds = books.map((b: any) => b._id.toString());

    // Borrar imágenes de Cloudinary en paralelo; un fallo no aborta la baja de cuenta
    await Promise.allSettled(
      books
        .filter((b: any) => b.image?.public_id)
        .map((b: any) => cloudinary.uploader.destroy(b.image.public_id))
    );

    // Datos propios del usuario
    await Promise.all([
      UserRepository.deleteUserBooks(userId),
      commentRepository.deleteAllByUserId(userId),
      CollectionRepository.deleteUserCollections(userId),
      FavoriteRepository.deleteUserFavorites(userId),
      FollowRepository.deleteUserFollows(userId),
      BookStatusRepository.deleteAllByUserId(userId),
      ActivityLogRepository.deleteAllByUserId(userId),
    ]);

    // Limpiar referencias huérfanas a los libros borrados en datos de otros usuarios
    if (bookIds.length > 0) {
      await Promise.all([
        commentRepository.deleteAllByBookIds(bookIds),
        FavoriteRepository.removeBookRefsFromAll(bookIds),
        CollectionRepository.removeBookRefsFromAll(bookIds),
        BookStatusRepository.deleteAllByBookIds(bookIds),
        ActivityLogRepository.deleteAllByBookIds(bookIds),
      ]);
    }

    // Quitar reacciones que el usuario dejó en comentarios ajenos y recalcular contadores
    await commentRepository.removeAllReactionsByUserId(userId);

    // Borrar el documento Mongo antes que Firebase: si Firebase falla, queda un user
    // sin doc (recuperable), no un doc sin auth (más difícil de reconciliar)
    await UserRepository.deleteUser(user.uid);
    await authFirebase.deleteUser(user.uid);
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

  async getFollowers(
    userId: string,
    limit = 10,
    offset = 0,
    currentUserId: string | null = null
  ): Promise<IFollowData> {
    return await FollowRepository.getFollowers(userId, limit, offset, currentUserId);
  },

  async getFollowing(
    userId: string,
    limit = 10,
    offset = 0,
    currentUserId: string | null = null
  ): Promise<IFollowingData> {
    return await FollowRepository.getFollowing(userId, limit, offset, currentUserId);
  },

  async getFollowStats(userId: string): Promise<IFollowStats> {
    return await FollowRepository.getFollowStats(userId);
  },
};
