import booksModel from '../models/books';
import usersModel from '../models/users';
import favoritesModel from '../models/favorites';
import { qyCheckUser } from '../db/userQueries';
import { IRepositoryUser } from '../types/IRepository';
import { qyFindAllBookFavorite } from '../db/bookQueries';

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

  async findUserAndBooks(username, limit, offset) {
    const user = await usersModel.findOne(
      {
        username: username,
      },
      'uid name picture createdAt'
    );
    const totalBooks = await booksModel.countDocuments({
      userId: user?.uid,
    });
    const results = await booksModel
      .find(
        {
          userId: user?.uid,
        },
        'title category language authors pathUrl image'
      )
      .skip(offset)
      .limit(limit)
      .sort({
        _id: -1,
      })
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

  async findAllBookFavoriteByUser(userId) {
    const query = qyFindAllBookFavorite(userId);

    return favoritesModel.aggregate(query).exec();
  },

  async createUser(userToSave) {
    const newUser = new usersModel(userToSave);

    return await newUser.save();
  },

  async deleteUserBooks(id) {
    return await booksModel.deleteOne(id);
  },

  async deleteUser(userId) {
    return await usersModel.deleteOne(userId);
  },
};
