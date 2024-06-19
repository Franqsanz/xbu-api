import { DecodedIdToken } from 'firebase-admin/auth';

import { cloudinary } from "../../config/cloudinary";
import { UserRepository } from "../../repositories/userRepository";
import { IBook, IUser, IUserAndBooks } from '../../types/types';

export const UserService = {
  async findAllUsers(): Promise<IUser[]> {
    try {
      return await UserRepository.findUsers();
    } catch (error) {
      throw error;
    }
  },

  async findCheckUser(userId: string): Promise<IUser | null> {
    try {
      return await UserRepository.findOne(userId);
    } catch (error) {
      throw error;
    }
  },

  async findUserAndBooks(username: string, limit: number, offset: number): Promise<IUserAndBooks> {
    try {
      return await UserRepository.findUserAndBooks(username, limit, offset);
    } catch (error) {
      throw error;
    }
  },

  async createUser(decodedToken: DecodedIdToken, username: string) {
    const userToSave = {
      ...decodedToken,
      username: username,
      createdAt: new Date(),
    };

    try {
      const existingUser = await UserRepository.findByUid(decodedToken.uid);
      const saveUser = await UserRepository.saveUser(userToSave);

      return { existingUser, saveUser };
    } catch (error) {
      throw error;
    }
  },

  async deleteAccount(userId: string): Promise<void> {
    try {
      const user = await UserRepository.findOne(userId);
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
    } catch (error) {
      throw error;
    }
  },
};
