import booksModel from "../models/books";
import usersModel from "../models/users";
import { qyCheckUser } from "../db/userQueries";
import { IBook, IUser, IUserToSave, UserAndBooks } from '../types/types';

export const UserRepository = {
  async findUsers(): Promise<IUser[]> {
    return await usersModel.find();
  },

  async findOne(userId: string): Promise<IUser | null> {
    const { query, projection } = qyCheckUser(userId);

    return await usersModel.findOne(query, projection);
  },

  async findByUid(uid: string): Promise<IUser | null> {
    return await usersModel.findOne({ uid });
  },

  async saveUser(userToSave: IUserToSave): Promise<IUser> {
    const newUser = new usersModel(userToSave);

    return await newUser.save();
  },

  async findUserAndBooks(username: string, limit: number, offset: number): Promise<UserAndBooks> {
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
  async findBooksByUserId(userId: string): Promise<IBook[]> {
    return await booksModel.find({ userId });
  },

  async deleteUserBooks(id: any) {
    return await booksModel.deleteOne(id);
  },

  async deleteUser(userId: any) {
    return await usersModel.deleteOne(userId);
  },
};
