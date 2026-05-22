import { Request, Response, NextFunction } from 'express';
import { caching } from 'cache-manager';

import { UserService } from '../../services/userService';
import { FeedRepository } from '../../repositories/feedRepository';
import { IUser, IUserAndBooks } from '../../types/types';
import { NotFound, BadRequest } from '../../utils/errors';

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
    const user = await UserService.findById(userId);

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

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

async function followUser(req: Request, res: Response, next: NextFunction): Promise<Response<any>> {
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
): Promise<Response<any>> {
  const currentUserId = req.user.uid;
  const { targetUserId: followingId } = req.params;

  try {
    // Verificar si estaba siguiendo
    const isFollowing = await UserService.isFollowing(currentUserId, followingId);

    if (!isFollowing) {
      throw BadRequest('No estás siguiendo a este usuario');
    }

    await UserService.unfollowUser(currentUserId, followingId);

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
): Promise<Response<any>> {
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
      parseInt(offset as string)
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
): Promise<Response<any>> {
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
      parseInt(offset as string)
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
): Promise<Response<any>> {
  const { userId } = req.params;

  try {
    const user = await UserService.findById(userId);

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    const { followersCount, followingCount } = await UserService.getFollowStats(userId);

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
): Promise<Response<IUserAndBooks>> {
  const { username } = req.params;
  const currentUserId = req.user?.uid;
  const { limit, offset } = req.pagination!;

  try {
    const { user, results, totalBooks } = await UserService.findUserByUsernameAndBooks(
      username,
      limit,
      offset
    );

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    req.calculatePagination!(totalBooks);

    const [isFollowing, followStats] = await Promise.all([
      currentUserId && currentUserId !== user.uid
        ? UserService.isFollowing(currentUserId, user.uid).then(Boolean)
        : Promise.resolve(false),
      UserService.getFollowStats(user.uid),
    ]);

    const response = {
      info: req.paginationInfo,
      user,
      results,
      isFollowing,
      followersCount: followStats.followersCount,
      followingCount: followStats.followingCount,
    };

    return res.status(200).json(response);
  } catch (err) {
    return next(err) as any;
  }
}

async function getFeed(req: Request, res: Response, next: NextFunction): Promise<Response<any>> {
  const currentUserId = req.user?.uid;
  const { limit = 10, offset = 0 } = req.query;

  if (!currentUserId) {
    throw BadRequest('Usuario no autenticado');
  }

  const parsedLimit = parseInt(limit as string);
  const parsedOffset = parseInt(offset as string);

  try {
    const { activities, total } = await FeedRepository.getFeed(
      currentUserId,
      parsedLimit,
      parsedOffset
    );

    const nextPage =
      parsedOffset + activities.length < total ? parsedOffset / parsedLimit + 1 : null;

    return res.status(200).json({
      activities,
      info: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        nextPage,
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

export {
  getUsers,
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
};
