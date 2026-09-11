import commentsModel from '../models/comments';

import { UserRepository } from './../repositories/userRepository';
import { FollowRepository, findFollowingSet } from './../repositories/followRepository';
import { CollectionRepository } from './../repositories/collectionRepository';
import { FavoriteRepository } from './../repositories/favoriteRepository';
import { commentRepository } from './../repositories/commentRepository';
import { BookStatusRepository } from './../repositories/bookStatusRepository';
import { ActivityLogRepository } from './../repositories/activityLogRepository';
import { BookRatingRepository } from './../repositories/bookRatingRepository';
import { BookProgressRepository } from './../repositories/bookProgressRepository';
import { NotificationRepository } from './../repositories/notificationRepository';
import { ReportRepository } from './../repositories/reportRepository';
import { cloudinary } from '../config/cloudinary';
import { authFirebase } from '../config/firebase';
import { IFullRepositoryUser } from '../types/repositories/IUserRepository';
import { IFollowData, IFollowingData, IFollowStats, ISuggestedUser, IUser } from '../types/types';

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;
const RESERVED_USERNAMES = new Set([
  'admin',
  'api',
  'me',
  'profile',
  'book',
  'books',
  'explore',
  'login',
  'logout',
  'register',
  'auth',
  'user',
  'users',
  'feed',
  'home',
  'about',
  'help',
  'support',
  'settings',
]);

export type UsernameValidation =
  | { ok: true }
  | { ok: false; reason: 'format' | 'reserved' | 'taken' };

export async function validateUsername(
  username: string,
  currentUid?: string
): Promise<UsernameValidation> {
  const normalized = username?.toLowerCase().trim();
  if (!normalized || !USERNAME_REGEX.test(normalized)) {
    return { ok: false, reason: 'format' };
  }
  if (RESERVED_USERNAMES.has(normalized)) {
    return { ok: false, reason: 'reserved' };
  }
  const existing = await UserRepository.findByUsername!(normalized);
  if (existing && (existing as any).uid !== currentUid) {
    return { ok: false, reason: 'taken' };
  }
  return { ok: true };
}

const CLOUDINARY_AVATAR_OPTIONS = {
  upload_preset: 'xbu-uploads',
  folder: `${process.env.CLOUDINARY_FOLDER}/avatars`,
  format: 'webp' as const,
  transformation: { quality: 70, width: 400, height: 400, crop: 'fill' as const },
};

function uploadAvatarToCloudinary(buffer: Buffer): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(CLOUDINARY_AVATAR_OPTIONS, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      })
      .end(buffer);
  });
}

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

  async findUserByUsernameAndBooksByCursor(
    username: string,
    cursorId: string | null,
    limit: number
  ) {
    return await (UserRepository as any).findUserByUsernameAndBooksByCursor(
      username,
      cursorId,
      limit
    );
  },

  async searchUsers(query: string, currentUserId: string | null, limit = 10) {
    const q = (query ?? '').trim();
    if (q.length < 2) return [];
    const users = await UserRepository.searchUsers(q, limit, currentUserId ?? undefined);
    const uids = users.map((u: any) => u.uid);
    const followingSet = await findFollowingSet(currentUserId, uids);
    return users.map((u: any) => ({
      uid: u.uid,
      name: u.name,
      username: u.username,
      picture: u.picture,
      isFollowing: followingSet.has(u.uid),
    }));
  },

  async saveUser(decodedToken, username) {
    const existingUser = await UserRepository.findByUid!(decodedToken.uid);
    if (existingUser) {
      return { existingUser, saveUser: existingUser };
    }

    const fallbackName = (decodedToken as any).email?.split('@')[0] ?? 'usuario';
    const userToSave = {
      ...decodedToken,
      name: (decodedToken as any).name || fallbackName,
      username: username,
      createdAt: new Date(),
    };

    const saveUser = await UserRepository.createUser(userToSave);
    return { existingUser: null, saveUser };
  },

  async deleteAccount(userId) {
    const user = await UserRepository.findById(userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const books = await UserRepository.findBooksByUserId!(userId);
    const bookIds = books.map((b: any) => b._id.toString());

    // Borrar assets en Cloudinary en paralelo: portadas (image), archivos de libros
    // propios (file, raw + authenticated) y avatar del user. Fallos no abortan la baja.
    const cloudinaryDestroys: Promise<any>[] = [];

    for (const b of books as any[]) {
      if (b.image?.public_id) {
        cloudinaryDestroys.push(cloudinary.uploader.destroy(b.image.public_id));
      }
      if (b.file?.public_id) {
        cloudinaryDestroys.push(
          cloudinary.uploader.destroy(b.file.public_id, {
            resource_type: 'raw',
            type: 'authenticated',
          })
        );
      }
    }

    const userPictureId = (user as any).pictureId;
    if (userPictureId) {
      cloudinaryDestroys.push(cloudinary.uploader.destroy(userPictureId));
    }

    await Promise.allSettled(cloudinaryDestroys);

    // Datos propios del usuario
    await Promise.all([
      UserRepository.deleteUserBooks(userId),
      commentRepository.deleteAllByUserId(userId),
      CollectionRepository.deleteUserCollections(userId),
      FavoriteRepository.deleteUserFavorites(userId),
      FollowRepository.deleteUserFollows(userId),
      BookStatusRepository.deleteAllByUserId(userId),
      BookProgressRepository.deleteAllByUserId(userId),
      ActivityLogRepository.deleteAllByUserId(userId),
      BookRatingRepository.deleteAllByUserId(userId),
      NotificationRepository.deleteAllByUserId(userId),
      ReportRepository.deleteAllByReporterId(userId),
    ]);

    // Limpiar referencias huérfanas a los libros borrados en datos de otros usuarios
    if (bookIds.length > 0) {
      await Promise.all([
        commentRepository.deleteAllByBookIds(bookIds),
        FavoriteRepository.removeBookRefsFromAll(bookIds),
        CollectionRepository.removeBookRefsFromAll(bookIds),
        BookStatusRepository.deleteAllByBookIds(bookIds),
        BookProgressRepository.deleteAllByBookIds(bookIds),
        ActivityLogRepository.deleteAllByBookIds(bookIds),
        BookRatingRepository.deleteAllByBookIds(bookIds),
        NotificationRepository.deleteAllByBookIds(bookIds),
        ReportRepository.deleteAllByBookIds(bookIds),
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

  async getSuggestions(userId: string, limit = 5): Promise<ISuggestedUser[]> {
    return await FollowRepository.getSuggestions(userId, limit);
  },

  async checkUsernameAvailability(
    username: string,
    currentUid?: string
  ): Promise<UsernameValidation> {
    return await validateUsername(username, currentUid);
  },

  async updateMe(
    uid: string,
    updates: { name?: string; username?: string; bio?: string },
    avatarBuffer?: Buffer
  ): Promise<IUser | null> {
    const current = await UserRepository.findByUid!(uid);
    if (!current) {
      throw new Error('Usuario no encontrado');
    }

    const patch: Partial<{
      name: string;
      username: string;
      bio: string;
      picture: string;
      pictureId: string;
    }> = {};

    if (typeof updates.name === 'string') {
      const trimmed = updates.name.trim();
      if (trimmed.length < 1 || trimmed.length > 60) {
        throw new Error('Nombre inválido (1 a 60 caracteres)');
      }
      patch.name = trimmed;
    }

    if (typeof updates.bio === 'string') {
      if (updates.bio.length > 300) {
        throw new Error('Bio demasiado larga (máx 300 caracteres)');
      }
      patch.bio = updates.bio;
    }

    if (typeof updates.username === 'string') {
      const normalized = updates.username.toLowerCase().trim();
      if (normalized !== (current as any).username) {
        const check = await validateUsername(normalized, uid);
        if (!check.ok) {
          throw new Error(
            check.reason === 'format'
              ? 'Username inválido (3-20 caracteres, solo a-z, 0-9, _)'
              : check.reason === 'reserved'
                ? 'Ese username está reservado'
                : 'Ese username ya está en uso'
          );
        }
        patch.username = normalized;
      }
    }

    if (avatarBuffer) {
      const uploaded = await uploadAvatarToCloudinary(avatarBuffer);
      patch.picture = uploaded.secure_url;
      patch.pictureId = uploaded.public_id;

      // Borrar la imagen anterior si era nuestra (tenía public_id propio)
      const previousId = (current as any).pictureId;
      if (previousId) {
        try {
          await cloudinary.uploader.destroy(previousId);
        } catch (err) {
          console.error('No se pudo borrar avatar anterior:', err);
        }
      }
    }

    const updated = await UserRepository.updateMe!(uid, patch);

    // Propagar cambios de nombre/username/avatar al snapshot denormalizado
    // en cada comentario del usuario. Ejecuta en background para no bloquear
    // la respuesta al cliente.
    const commentPatch: Record<string, string> = {};
    if (patch.name !== undefined) commentPatch['author.name'] = patch.name;
    if (patch.username !== undefined) commentPatch['author.username'] = patch.username;
    if (patch.picture !== undefined) commentPatch['author.avatar'] = patch.picture;
    if (Object.keys(commentPatch).length > 0) {
      commentsModel
        .updateMany({ 'author.userId': uid }, { $set: commentPatch })
        .catch((err) => console.error('[updateMe] failed to propagate to comments:', err));
    }

    return updated;
  },
};
