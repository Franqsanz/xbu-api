import bookProgressModel from '../models/bookProgress';

type BookFileType = 'pdf' | 'epub';

export type ProgressUpsertInput = {
  position: number | string;
  type: BookFileType;
  percentage?: number;
};

export const BookProgressRepository = {
  async getProgress(userId: string, bookId: string) {
    return await bookProgressModel.findOne({ userId, bookId }).lean().exec();
  },

  async upsertProgress(userId: string, bookId: string, input: ProgressUpsertInput) {
    return await bookProgressModel
      .findOneAndUpdate(
        { userId, bookId },
        {
          $set: {
            position: input.position,
            type: input.type,
            percentage: input.percentage,
          },
        },
        { new: true, upsert: true }
      )
      .lean()
      .exec();
  },

  async deleteProgress(userId: string, bookId: string) {
    return await bookProgressModel.deleteOne({ userId, bookId }).exec();
  },

  async deleteAllByUserId(userId: string) {
    return await bookProgressModel.deleteMany({ userId }).exec();
  },

  async deleteAllByBookIds(bookIds: string[]) {
    if (bookIds.length === 0) return { deletedCount: 0 };
    return await bookProgressModel.deleteMany({ bookId: { $in: bookIds } }).exec();
  },
};
