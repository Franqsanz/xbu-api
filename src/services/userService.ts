import { UserRepository } from './../repositories/userRepository';
import { CollectionRepository } from './../repositories/collectionRepository';
import { FavoriteRepository } from './../repositories/favoriteRepository';
import { commentRepository } from './../repositories/commetRepository';
import { cloudinary } from '../config/cloudinary';
import { authFirebase } from '../config/firebase';
import { IFullRepositoryUser } from '../types/IRepository';

export const UserService: IFullRepositoryUser = {
  async findUsers() {
    try {
      return await UserRepository.findUsers();
    } catch (err) {
      throw err;
    }
  },

  async findById(userId) {
    try {
      return await UserRepository.findById(userId);
    } catch (err) {
      throw err;
    }
  },

  async findUserAndBooks(username, limit, offset) {
    try {
      return await UserRepository.findUserAndBooks(username, limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async saveUser(decodedToken, username) {
    const userToSave = {
      ...decodedToken,
      username: username,
      createdAt: new Date(),
    };

    try {
      const existingUser = await UserRepository.findByUid!(decodedToken.uid);
      const saveUser = await UserRepository.createUser(userToSave);

      return {
        existingUser,
        saveUser,
      };
    } catch (err) {
      throw err;
    }
  },

  async deleteAccount(userId) {
    try {
      const user = await UserRepository.findById(userId);
      const books = await UserRepository.findBooksByUserId!(userId);

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      // Eliminar todas las imágenes de libros de Cloudinary
      for (let book of books) {
        const public_id = book.image.public_id;
        await cloudinary.uploader.destroy(public_id);
      }

      await UserRepository.deleteUserBooks(userId);
      await commentRepository.deleteAllByUserId(userId);
      await CollectionRepository.deleteUserCollections(userId);
      await FavoriteRepository.deleteUserFavorites(userId);
      await authFirebase.deleteUser(user?.uid);

      return await UserRepository.deleteUser(user?.uid);
    } catch (err) {
      throw err;
    }
  },
};
