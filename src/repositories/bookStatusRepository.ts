import bookStatusesModel from '../models/bookStatuses';
import { IBookStatus, BookStatusValue } from '../types/types';
import { IBookStatusOperations } from '../types/repositories/IBookStatusRepository';

export const BookStatusRepository: IBookStatusOperations = {
  async getStatus(userId: string, bookId: string): Promise<IBookStatus | null> {
    return (await bookStatusesModel
      .findOne({ userId, bookId })
      .lean()
      .exec()) as IBookStatus | null;
  },

  async setStatus(
    userId: string,
    bookId: string,
    status: BookStatusValue
  ): Promise<IBookStatus | null> {
    return (await bookStatusesModel
      .findOneAndUpdate({ userId, bookId }, { $set: { status } }, { new: true, upsert: true })
      .lean()
      .exec()) as IBookStatus | null;
  },

  async deleteStatus(userId: string, bookId: string) {
    return await bookStatusesModel.deleteOne({ userId, bookId }).exec();
  },

  async deleteAllByUserId(userId: string) {
    return await bookStatusesModel.deleteMany({ userId }).exec();
  },

  async deleteAllByBookIds(bookIds: string[]) {
    if (bookIds.length === 0) return { deletedCount: 0 };
    return await bookStatusesModel.deleteMany({ bookId: { $in: bookIds } }).exec();
  },

  async listByUserAndStatus(
    userId: string,
    status: BookStatusValue,
    limit: number = 10,
    offset: number = 0
  ): Promise<{ items: IBookStatus[]; total: number }> {
    const [items, total] = await Promise.all([
      bookStatusesModel
        .find({ userId, status })
        .sort({ updatedAt: -1 })
        .skip(offset)
        .limit(limit)
        .lean()
        .exec(),
      bookStatusesModel.countDocuments({ userId, status }),
    ]);
    return { items: items as IBookStatus[], total };
  },
};
