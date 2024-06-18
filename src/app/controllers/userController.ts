import { Request, Response } from 'express';

import { UserService } from "../services/userService";
import { IUser, IUserAndBooks } from '../../types/types';

async function getUsers(req: Request, res: Response): Promise<Response<IUser[]>> {
  try {
    const users = await UserService.findAllUsers();

    return res.status(200).json(users);
  } catch (error) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getCheckUser(req: Request, res: Response): Promise<Response<IUser | null>> {
  const { userId } = req.params;

  try {
    const user = await UserService.findCheckUser(userId);

    if (!user) {
      return res.status(404).json({ error: { message: 'Usuario no encontrado' } });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getUserAndBooks(req: Request, res: Response): Promise<Response<IUserAndBooks>> {
  // const token = (req.headers['authorization'] || '').split(' ')[1];
  const { username } = req.params;
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string) || 1;
  const offset = (page - 1) * limit;

  try {
    const { user, results, totalBooks } = await UserService.findUserAndBooks(username, limit, offset);

    if (!user) {
      return res.status(404).json({ error: { message: 'Usuario no encontrado' } });
    }

    const totalPages = Math.ceil(totalBooks / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const nextPageLink = nextPage ? `${req.protocol}://${req.get('host')}/api/users${req.path}?page=${nextPage}${limit ? `&limit=${limit}` : ''}` : null;

    const info = {
      totalBooks,
      totalPages,
      currentPage: page,
      nextPage: nextPage,
      prevPage: page > 1 ? page - 1 : null,
      nextPageLink: nextPageLink,
      prevPageLink: page > 1 ? `${req.protocol}://${req.get('host')}/api/users${req.path}?page=${page - 1}${limit ? `&limit=${limit}` : ''}` : null,
    };

    const response = {
      info,
      user,
      results,
    };

    return res.status(200)
      // .cookie('acc_tk', token, {
      //   httpOnly: true,
      //   secure: process.env.NODE_ENV === 'production',
      //   sameSite: 'lax',
      // })
      .json(response);
  } catch (error) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function deleteAccount(req: Request, res: Response): Promise<Response<void>> {
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

    return res.status(200).json({ success: { message: 'Cuenta eliminada' } });
  } catch (error) {
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

export {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  deleteAccount,
};
