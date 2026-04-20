import { Request, Response, NextFunction } from 'express';
import { caching } from 'cache-manager';

import { UserService } from '../../services/userService';
import { IUser, IUserAndBooks } from '../../types/types';
import { NotFound } from '../../utils/errors';

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
  const { limit, offset } = req.pagination!;

  try {
    const { user, results, totalBooks } = await UserService.findUserAndBooks(userId, limit, offset);

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    req.calculatePagination!(totalBooks);

    const response = {
      info: req.paginationInfo,
      user,
      results,
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

export { getUsers, getCheckUser, getUserAndBooks, deleteAccount };
