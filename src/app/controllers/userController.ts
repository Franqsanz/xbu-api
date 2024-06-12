import { Request, Response } from 'express';
import { v2 as cloudinary } from 'cloudinary';

import booksModel from "../../models/books";
import usersModel from "../../models/users";
import { qyCheckUser } from "../../db/userQueries";


async function getUsers(req: Request, res: Response) {
  try {
    const users = await usersModel.find();

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener los usuario', error);
  }
}

async function getCheckUser(req: Request, res: Response) {
  const { userId } = req.params;
  const { query, projection } = qyCheckUser(userId);

  try {
    const user = await usersModel.findOne(query, projection);

    if (!user) {
      return res.status(404).json({ error: { message: 'Usuario no encontrado' } });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error al buscar el usuario', error);
  }
}

async function getUserAndBooks(req: Request, res: Response) {
  const { username } = req.params;
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string) || 1;
  const offset = (page - 1) * limit;

  try {
    const user = await usersModel.findOne({ username: username }, 'uid name picture createdAt');

    if (!user) {
      return res.status(404).json({ error: { message: 'Usuario no encontrado' } });
    }

    const results = await booksModel.find({ userId: user.uid }, 'title category language authors pathUrl image').skip(offset).limit(limit).sort({ _id: -1 }).exec();
    const totalBooks = await booksModel.countDocuments({ userId: user.uid });

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

    // if (results.length < 1) {
    //   return res.status(404).json({ info: { message: 'No se encontraron más libros' } });
    // }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener el usuario y los libros:', error);
  }
}

async function deleteAccount(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const user = await usersModel.findOne({ uid: userId });
    const books = await booksModel.find({ userId: userId });

    if (!user) {
      return res.status(404).json({ info: { message: 'Usuario no encontrado' } });
    }

    for (let book of books) {
      const public_id = book.image.public_id;
      await cloudinary.uploader.destroy(public_id);
      await book.deleteOne();
    }

    await user?.deleteOne();

    res.status(200).json({ success: { message: 'Cuenta eliminada' } });
  } catch (error) {
    res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

export {
  getUsers,
  getCheckUser,
  getUserAndBooks,
  deleteAccount,
};
