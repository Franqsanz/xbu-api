import activityLogModel from '../models/activityLog';

export type ActivityLogType = 'favorite' | 'collection';

export const ActivityLogRepository = {
  async record(userId: string, type: ActivityLogType, bookId: string) {
    return await activityLogModel
      .findOneAndUpdate(
        { userId, type, bookId },
        { $set: { userId, type, bookId } },
        { new: true, upsert: true, timestamps: true }
      )
      .lean()
      .exec();
  },

  async remove(userId: string, type: ActivityLogType, bookId: string) {
    return await activityLogModel.deleteOne({ userId, type, bookId }).exec();
  },

  async findByUsersAndTypes(userIds: string[], types: ActivityLogType[], limit: number) {
    return await activityLogModel
      .find({ userId: { $in: userIds }, type: { $in: types } })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()
      .exec();
  },

  async deleteAllByUserId(userId: string) {
    return await activityLogModel.deleteMany({ userId }).exec();
  },

  async deleteAllByBookIds(bookIds: string[]) {
    if (bookIds.length === 0) return { deletedCount: 0 };
    return await activityLogModel.deleteMany({ bookId: { $in: bookIds } }).exec();
  },
};
