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
): Promise<Response<IUser | null>> {
  const { userId } = req.params;
  const key = `user:${userId}`;

  const memoryCache = await caching('memory', {
    max: 100,
    ttl: 24 * 3600 * 1000
  });

  try {
    // Intentar obtener el usuario del caché
    const cachedUser = await memoryCache.get<string>(key);

    if (cachedUser) {
      // Devolver el usuario almacenado
      return res.status(200).json(JSON.parse(cachedUser));
    }

    // Obtener el usuario de la base de datos
    const user = await UserService.findById(userId);

    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }

    // Almacenar el usuario en caché como JSON
    await memoryCache.set(key, JSON.stringify(user));

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
  // const token = (req.headers['authorization'] || '').split(' ')[1];
  const { username } = req.params;
  const { limit, offset } = req.pagination!;

  try {
    const { user, results, totalBooks } = await UserService.findUserAndBooks(
      username,
      limit,
      offset
    );

    if (!user) {
      throw NotFound('Usuario no encontrado');
    }

    req.calculatePagination!(totalBooks);

    const response = {
      info: req.paginationInfo,
      user,
      results,
    };

    return (
      res
        .status(200)
        // .cookie('acc_tk', token, {
        //   httpOnly: true,
        //   secure: process.env.NODE_ENV === 'production',
        //   sameSite: 'lax',
        // })
        .json(response)
    );
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
    // const user = await usersModel.findOne({ uid: userId });
    // const books = await booksModel.find({ userId: userId });

    // if (!user) {
    //   return res.status(404).json({ info: { message: 'Usuario no encontrado' } });
    // }

    // for (let book of books) {
    //   const public_id = book.image.public_id;
    //   await cloudinary.uploader.destroy(public_id);
    //   await book.deleteOne();
    // }

    // await user?.deleteOne();
    await UserService.deleteAccount(userId);

    return res.status(200).json({
      success: {
        message: 'Cuenta eliminada',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

export { getUsers, getCheckUser, getUserAndBooks, deleteAccount };
