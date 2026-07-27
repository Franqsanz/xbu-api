import notificationsModel from '../models/notifications';

export type NotificationType = 'follow' | 'comment' | 'rating' | 'reaction' | 'reply';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  actorId: string;
  bookId?: string;
  commentId?: string;
  rating?: number;
  reactionType?: 'like' | 'dislike';
};

export const NotificationRepository = {
  async create(input: CreateNotificationInput) {
    const doc = new notificationsModel(input);
    return await doc.save();
  },

  async findByUser(userId: string, limit: number, offset: number) {
    const results = await notificationsModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .lean()
      .exec();

    const total = await notificationsModel.countDocuments({ userId }).exec();

    return { results, total };
  },

  async findByUserByCursor(
    userId: string,
    cursor: { date: Date; id: string } | null,
    limit: number
  ) {
    const filter: any = { userId };
    if (cursor) {
      filter.$or = [
        { createdAt: { $lt: cursor.date } },
        { createdAt: cursor.date, _id: { $lt: cursor.id } },
      ];
    }
    const results = await notificationsModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();

    // Solo contamos total en la primera página (sin cursor).
    const total = cursor ? null : await notificationsModel.countDocuments({ userId }).exec();

    return { results, total };
  },

  async countUnread(userId: string) {
    return await notificationsModel.countDocuments({ userId, read: false }).exec();
  },

  async markAsRead(notificationId: string, userId: string) {
    return await notificationsModel
      .findOneAndUpdate({ _id: notificationId, userId }, { read: true }, { new: true, lean: true })
      .exec();
  },

  async setReadStatus(notificationId: string, userId: string, read: boolean) {
    return await notificationsModel
      .findOneAndUpdate({ _id: notificationId, userId }, { read }, { new: true, lean: true })
      .exec();
  },

  async markAllAsRead(userId: string) {
    return await notificationsModel.updateMany({ userId, read: false }, { read: true }).exec();
  },

  async deleteOne(notificationId: string, userId: string) {
    return await notificationsModel.findOneAndDelete({ _id: notificationId, userId }).lean().exec();
  },

  async deleteByActorTypeRef(opts: {
    userId: string;
    actorId: string;
    type: NotificationType;
    bookId?: string;
    commentId?: string;
  }) {
    const filter: any = {
      userId: opts.userId,
      actorId: opts.actorId,
      type: opts.type,
    };
    if (opts.bookId) filter.bookId = opts.bookId;
    if (opts.commentId) filter.commentId = opts.commentId;
    return await notificationsModel.deleteMany(filter).exec();
  },

  async deleteAllByUserId(userId: string) {
    return await notificationsModel.deleteMany({ $or: [{ userId }, { actorId: userId }] }).exec();
  },

  async deleteAllByBookIds(bookIds: string[]) {
    if (bookIds.length === 0) return { deletedCount: 0 };
    return await notificationsModel.deleteMany({ bookId: { $in: bookIds } }).exec();
  },
};
