import booksModel from "../models/books";
import usersModel from "../models/users";
import { qyCheckUser } from "../db/userQueries";
import { BookRepository } from './bookRepository';

export const UserRepository = {
  async findUsers() {
    return await usersModel.find();
  },

  async findOne(userId: string) {
    const { query, projection } = qyCheckUser(userId);

    return await usersModel.findOne(query, projection);
  },

  async createUser(decodedToken: any, userToSave: any) {
    const existingUser = await usersModel.findOne({ uid: decodedToken.uid });

    const newUser = new usersModel(userToSave);
    return await newUser.save();
  },

  async findUserAndBooks(username: string, limit: number, offset: number) {
    const user = await usersModel.findOne({ username: username }, 'uid name picture createdAt');
    const totalBooks = await booksModel.countDocuments({ userId: user?.uid });
    const results = await booksModel.find({ userId: user?.uid }, 'title category language authors pathUrl image')
      .skip(offset)
      .limit(limit)
      .sort({ _id: -1 })
      .exec();

    return { user, results, totalBooks };
  },

  // Busca todos los libros de un usuario
  async findBooksByUserId(userId: string) {
    return await booksModel.find({ userId });
  },

  async deleteUserBooks(id: any) {
    return await booksModel.deleteOne(id);
  },

  async deleteUser(userId: any) {
    return await usersModel.deleteOne(userId);
  },
};
