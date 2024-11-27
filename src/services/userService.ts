import { DecodedIdToken } from 'firebase-admin/auth';

import { UserRepository } from './../repositories/userRepository';
import { cloudinary } from '../config/cloudinary';
// import { IRepositoryUser, IUserService } from '../types/IRepository';

export const UserService = {
  async findUsers() {
    try {
      return await UserRepository.findUsers();
    } catch (err) {
      throw err;
    }
  },

  async findById(userId: string) {
    try {
      return await UserRepository.findById(userId);
    } catch (err) {
      throw err;
    }
  },

  async findUserAndBooks(username: string, limit: number, offset: number) {
    try {
      return await UserRepository.findUserAndBooks(username, limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async findAllBookFavoriteByUser(userId: string, limit: number, offset: number) {
    try {
      return await UserRepository.findAllBookFavoriteByUser(userId, limit, offset);
    } catch (error) {
      throw error;
    }
  },

  async addBookToCollection(
    userId: string,
    collectionId: string[],
    bookId: string,
    checked: boolean
  ) {
    try {
      return await UserRepository.addBookToCollection(userId, collectionId, bookId, checked);
    } catch (err) {
      throw err;
    }
  },

  async removeBookFromCollection(userId: string, collectionId: string[], bookId: string) {
    try {
      return await UserRepository.removeBookFromCollection(userId, collectionId, bookId);
    } catch (err) {
      throw err;
    }
  },

  async saveUser(decodedToken: DecodedIdToken, username: string) {
    const userToSave = {
      ...decodedToken,
      username: username,
      createdAt: new Date(),
    };

    try {
      const existingUser = await UserRepository.findByUid(decodedToken.uid);
      const saveUser = await UserRepository.createUser(userToSave);

      return {
        existingUser,
        saveUser,
      };
    } catch (err) {
      throw err;
    }
  },

  async findAllCollections(userId: string) {
    try {
      return await UserRepository.findAllCollections(userId);
    } catch (err) {
      throw err;
    }
  },

  async saveCollections(userId: string, name: string) {
    try {
      return await UserRepository.createCollections(userId, name);
    } catch (err) {
      throw err;
    }
  },

  async findOneCollection(collectionId: string) {
    try {
      return await UserRepository.findOneCollection(collectionId);
    } catch (err) {
      throw err;
    }
  },

  async findCollectionsForUser(userId: string, bookId: string) {
    try {
      return await UserRepository.findCollectionsForUser(userId, bookId);
    } catch (err) {
      throw err;
    }
  },

  async updateCollectionName(userId: string, collectionId: string, name: string) {
    try {
      return await UserRepository.updateCollectionName(userId, collectionId, name);
    } catch (err) {
      throw err;
    }
  },

  async deleteCollections(userId: string, collectionId: string) {
    try {
      return await UserRepository.deleteCollections(userId, collectionId);
    } catch (err) {
      throw err;
    }
  },

  async deleteAccount(userId: string) {
    try {
      const user = await UserRepository.findById(userId);
      const books = await UserRepository.findBooksByUserId(userId);

      if (!user) {
        throw new Error('Usuario no encontrado');
      }

      for (let book of books) {
        const public_id = book.image.public_id;
        await cloudinary.uploader.destroy(public_id);

        return await UserRepository.deleteUserBooks(book.userId);
      }

      return await UserRepository.deleteUser(user?.uid);
    } catch (err) {
      throw err;
    }
  },
};
