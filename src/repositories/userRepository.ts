import booksModel from '../models/books';
import usersModel from '../models/users';
import { qyCheckUser } from '../db/userQueries';
import { IRepositoryUser } from '../types/repositories/IUserRepository';

export const UserRepository: IRepositoryUser = {
  async findUsers() {
    return await usersModel.find();
  },

  async findById(userId) {
    const { query, projection } = qyCheckUser(userId);
    return await usersModel.findOne(query, projection);
  },

  async findByUid(uid) {
    return await usersModel.findOne({
      uid,
    });
  },

  async findByUsername(username: string) {
    return await usersModel.findOne({ username: username.toLowerCase().trim() }).lean().exec();
  },

  async updateMe(
    uid: string,
    updates: Partial<{
      name: string;
      username: string;
      bio: string;
      picture: string;
      pictureId: string;
    }>
  ) {
    return await usersModel
      .findOneAndUpdate({ uid }, { $set: updates }, { new: true })
      .lean()
      .exec();
  },

  async findUserAndBooks(userId, limit, offset) {
    const user = await usersModel.findOne({ uid: userId }, 'uid name picture createdAt');

    const totalBooks = await booksModel.countDocuments({
      userId: userId,
    });

    const results = await booksModel
      .find({ userId: user?.uid }, 'title category language authors pathUrl image')
      .skip(offset)
      .limit(limit)
      .sort({ _id: -1 })
      .exec();

    return {
      user,
      results,
      totalBooks,
    };
  },

  // Busca todos los libros de un usuario
  async findBooksByUserId(userId) {
    return await booksModel.find({
      userId,
    });
  },

  async createUser(userToSave) {
    const newUser = new usersModel(userToSave);
    return await newUser.save();
  },

  async deleteUserBooks(userId) {
    return await booksModel.deleteMany({ userId });
  },

  async deleteUser(userId) {
    return await usersModel.deleteOne({ uid: userId });
  },

  async findUserByUsernameAndBooks(username, limit, offset) {
    const user = await usersModel.findOne(
      { username: { $regex: `^${username.trim()}$`, $options: 'i' } },
      'uid name picture username bio createdAt'
    );

    if (!user) {
      return {
        user: null,
        results: [],
        totalBooks: 0,
      };
    }

    const totalBooks = await booksModel.countDocuments({
      userId: user.uid,
    });

    const results = await booksModel
      .find({ userId: user.uid }, 'title category language authors pathUrl image')
      .skip(offset)
      .limit(limit)
      .sort({ _id: -1 })
      .exec();

    return {
      user,
      results,
      totalBooks,
    };
  },
};
