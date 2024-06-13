import { cloudinary } from "../../config/cloudinary";
import { UserRepository } from "../../repositories/userRepository";

export const UserService = {
  async findAllUsers() {
    try {
      return await UserRepository.findUsers();
    } catch (error) {
      throw error;
    }
  },

  async findCheckUser(userId: string) {
    try {
      return await UserRepository.findOne(userId);
    } catch (error) {
      throw error;
    }
  },

  async findUserAndBooks(username: string, limit: number, offset: number) {
    try {
      return await UserRepository.findUserAndBooks(username, limit, offset);
    } catch (error) {
      throw error;
    }
  },

  async deleteAccount(userId: string) {
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
