import { Request, Response, NextFunction } from 'express';

import { UserService } from '../../services/userService';
import { FeedService } from '../../services/feedService';
import { CacheService } from '../../services/cacheService';
import { BookStatusService } from '../../services/bookStatusService';
import { BookService } from '../../services/bookService';
import { commentService } from '../../services/commentService';
import { NotificationService } from '../../services/notificationService';
import { NotificationRepository } from '../../repositories/notificationRepository';
import { IUser, IUserAndBooks } from '../../types/types';
import {
  SuccessMessage,
  FollowStatsResponse,
  FollowersListResponse,
  FollowingListResponse,
  FeedResponse,
} from '../../types/responses';
import { NotFound, BadRequest } from '../../utils/errors';
import {
  encodeDateCursor,
  decodeDateCursor,
  encodeIdCursor,
  decodeIdCursor,
} from '../../utils/cursor';

const FOLLOW_STATS_CACHE_TTL = 300; // 5 minutos
const ME_CACHE_TTL = 300; // 5 minutos

function followStatsKey(userId: string) {
  return `users:follow-stats:${userId}`;
}

function meKey(userId: string) {
  return `users:me:${userId}`;
}

async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IUser[]>> {
  try {
    const users = await UserService.findUsers();

    return res.status(200).json(users);
  } catch (err) {
    return next(err) as any;
  }
}

async function getCheckUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IUser>> {
  const userId = req.user.uid;

  try {
    const user = await CacheService.getOrSet(
      meKey(userId),
      async () => {
        const u = await UserService.findById(userId);
        if (!u) {
          throw NotFound('Usuario no encontrado');
        }
        return u;
      },
      ME_CACHE_TTL
    );

    return res.status(200).json(user);
  } catch (err) {
    return next(err) as any;
  }
}

async function getUserAndBooks(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IUserAndBooks>> {
  const { userId } = req.params;
  const currentUserId = req.user?.uid;
  const { limit, offset } = req.pagination!;

  try {
    const { user, results, totalBooks } = await UserService.findUserAndBooks(userId, limit, offset);

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    req.calculatePagination!(totalBooks);

    let isFollowing = false;

    if (currentUserId && currentUserId !== userId) {
      isFollowing = !!(await UserService.isFollowing(currentUserId, userId));
    }

    const response = {
      info: req.paginationInfo,
      user,
      results,
      isFollowing,
    };

    return res.status(200).json(response);
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteAccount(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<void>> {
  const { userId } = req.params;

  try {
    await UserService.deleteAccount(userId);

    await CacheService.del(meKey(userId), followStatsKey(userId));

    res.clearCookie('_secure_tk', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : ('lax' as const),
    });
    res.clearCookie('_refresh_tk', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : ('lax' as const),
    });

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Cuenta eliminada',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function followUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<SuccessMessage>> {
  const currentUserId = req.user.uid;
  const { targetUserId: followingId } = req.params;

  try {
    if (currentUserId === followingId) {
      throw BadRequest('No puedes seguirte a ti mismo');
    }

    // Verificar si el usuario a seguir existe
    const userToFollow = await UserService.findById(followingId);

    if (!userToFollow) {
      throw NotFound('Usuario a seguir no encontrado');
    }

    // Verificar si ya está siguiendo
    const alreadyFollowing = await UserService.isFollowing(currentUserId, followingId);

    if (alreadyFollowing) {
      throw BadRequest('Ya estás siguiendo a este usuario');
    }

    await UserService.followUser(currentUserId, followingId);

    await CacheService.del(followStatsKey(currentUserId), followStatsKey(followingId));

    NotificationService.createSafe({
      userId: followingId,
      type: 'follow',
      actorId: currentUserId,
    });

    return res.status(201).json({
      success: {
        status: 201,
        message: 'Siguiendo usuario',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function unfollowUser(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<SuccessMessage>> {
  const currentUserId = req.user.uid;
  const { targetUserId: followingId } = req.params;

  try {
    // Verificar si estaba siguiendo
    const isFollowing = await UserService.isFollowing(currentUserId, followingId);

    if (!isFollowing) {
      throw BadRequest('No estás siguiendo a este usuario');
    }

    await UserService.unfollowUser(currentUserId, followingId);

    await CacheService.del(followStatsKey(currentUserId), followStatsKey(followingId));

    NotificationRepository.deleteByActorTypeRef({
      userId: followingId,
      actorId: currentUserId,
      type: 'follow',
    }).catch((err) => console.error('[unfollowUser] failed to delete follow notification:', err));

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Dejó de seguir usuario',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function getFollowers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<FollowersListResponse>> {
  const { userId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const user = await UserService.findById(userId);

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    const { followers, totalFollowers } = await UserService.getFollowers(
      userId,
      parseInt(limit as string),
      parseInt(offset as string),
      req.user?.uid ?? null
    );

    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
      },
      followers,
      totalFollowers,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function getFollowing(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<FollowingListResponse>> {
  const { userId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const user = await UserService.findById(userId);
    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    const { following, totalFollowing } = await UserService.getFollowing(
      userId,
      parseInt(limit as string),
      parseInt(offset as string),
      req.user?.uid ?? null
    );

    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
      },
      following,
      totalFollowing,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function getFollowStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<FollowStatsResponse>> {
  const { userId } = req.params;

  try {
    const user = await UserService.findById(userId);

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    const { followersCount, followingCount } = await CacheService.getOrSet(
      followStatsKey(userId),
      () => UserService.getFollowStats(userId),
      FOLLOW_STATS_CACHE_TTL
    );

    return res.status(200).json({
      user: {
        id: user._id,
        username: user.username,
      },
      followersCount,
      followingCount,
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function getUserAndBooksByUsername(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<any> {
  const { username } = req.params;
  const currentUserId = req.user?.uid;

  const rawCursor = (req.query.cursor as string) || null;
  const rawLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;

  const cursorId = rawCursor ? decodeIdCursor(rawCursor) : null;
  if (rawCursor && !cursorId) {
    return next(BadRequest('Cursor inválido.')) as any;
  }

  try {
    const { user, results, totalBooks } = await (
      UserService as any
    ).findUserByUsernameAndBooksByCursor(username, cursorId, limit);

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    const last = results[results.length - 1];
    const nextCursor = results.length === limit && last ? encodeIdCursor(String(last._id)) : null;
    const nextUrl = nextCursor
      ? `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}?cursor=${nextCursor}&limit=${limit}`
      : null;

    const info: {
      nextCursor: string | null;
      nextUrl: string | null;
      totalBooks?: number;
    } = { nextCursor, nextUrl };
    if (totalBooks !== null) info.totalBooks = totalBooks;

    const [isFollowing, followStats, readCount, commentsCount, topCategories, booksStats] =
      await Promise.all([
        currentUserId && currentUserId !== user.uid
          ? UserService.isFollowing(currentUserId, user.uid).then(Boolean)
          : Promise.resolve(false),
        UserService.getFollowStats(user.uid),
        BookStatusService.countByUserAndStatus(user.uid, 'read'),
        commentService.countByUserId(user.uid),
        BookService.findTopCategoriesByUser(user.uid, 4),
        BookService.findStatsByUser(user.uid),
      ]);

    const response = {
      info,
      user,
      isFollowing,
      followersCount: followStats.followersCount,
      followingCount: followStats.followingCount,
      readCount,
      commentsCount,
      topCategories,
      booksStats,
      results,
    };

    return res.status(200).json(response);
  } catch (err) {
    return next(err) as any;
  }
}

async function getFeed(req: Request, res: Response, next: NextFunction): Promise<any> {
  const currentUserId = req.user?.uid;

  if (!currentUserId) {
    throw BadRequest('Usuario no autenticado');
  }

  const rawCursor = (req.query.cursor as string) || null;
  const rawLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 30) : 10;

  const cursor = rawCursor ? decodeDateCursor(rawCursor) : null;
  if (rawCursor && !cursor) {
    return next(BadRequest('Cursor inválido.')) as any;
  }

  try {
    const { activities, total, hasMore } = await FeedService.getFeed(currentUserId, cursor, limit);

    const last = activities[activities.length - 1];
    const nextCursor = hasMore && last ? encodeDateCursor(new Date(last.createdAt)) : null;
    const nextUrl = nextCursor
      ? `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}?cursor=${nextCursor}&limit=${limit}`
      : null;

    const info: {
      nextCursor: string | null;
      nextUrl: string | null;
      total?: number;
    } = { nextCursor, nextUrl };
    if (total !== null) info.total = total;

    return res.status(200).json({ info, activities });
  } catch (err) {
    return next(err) as any;
  }
}

async function getCheckUsername(req: Request, res: Response, next: NextFunction): Promise<any> {
  const username = (req.query.u as string) ?? '';
  const currentUid = req.user?.uid;

  try {
    const result = await UserService.checkUsernameAvailability(username, currentUid);
    return res.status(200).json(result);
  } catch (err) {
    return next(err) as any;
  }
}

async function patchMe(req: Request, res: Response, next: NextFunction): Promise<any> {
  const currentUid = req.user?.uid;
  const { body, file } = req;

  if (!currentUid) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const updates = body.profile ? JSON.parse(body.profile) : {};
    const updated = await UserService.updateMe(currentUid, updates, file?.buffer);

    if (!updated) {
      throw NotFound('Usuario no encontrado');
    }

    await CacheService.del(meKey(currentUid));

    return res.status(200).json(updated);
  } catch (err: any) {
    if (
      err?.message?.includes('inválido') ||
      err?.message?.includes('en uso') ||
      err?.message?.includes('reservado') ||
      err?.message?.includes('larga')
    ) {
      return res.status(400).json({ error: { status: 400, message: err.message } });
    }
    return next(err) as any;
  }
}

async function searchUsers(req: Request, res: Response, next: NextFunction): Promise<any> {
  const query = (req.query.q as string) ?? '';
  const currentUserId = req.user?.uid ?? null;
  const limitRaw = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 20) : 10;

  try {
    const results = await UserService.searchUsers(query, currentUserId, limit);
    return res.status(200).json(results);
  } catch (err) {
    return next(err) as any;
  }
}

export {
  getUsers,
  searchUsers,
  getCheckUser,
  getUserAndBooks,
  getUserAndBooksByUsername,
  deleteAccount,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getFollowStats,
  getFeed,
  getCheckUsername,
  patchMe,
};
