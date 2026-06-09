import notificationsModel from '../models/notifications';

export type NotificationType = 'follow' | 'comment' | 'rating';

export type CreateNotificationInput = {
  userId: string;
  type: NotificationType;
  actorId: string;
  bookId?: string;
  commentId?: string;
  rating?: number;
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

  async countUnread(userId: string) {
    return await notificationsModel.countDocuments({ userId, read: false }).exec();
  },

  async markAsRead(notificationId: string, userId: string) {
    return await notificationsModel
      .findOneAndUpdate({ _id: notificationId, userId }, { read: true }, { new: true, lean: true })
      .exec();
  },

  async markAllAsRead(userId: string) {
    return await notificationsModel.updateMany({ userId, read: false }, { read: true }).exec();
  },

  async deleteByActorTypeRef(opts: {
    userId: string;
    actorId: string;
    type: NotificationType;
    bookId?: string;
  }) {
    const filter: any = {
      userId: opts.userId,
      actorId: opts.actorId,
      type: opts.type,
    };
    if (opts.bookId) filter.bookId = opts.bookId;
    return await notificationsModel.deleteMany(filter).exec();
  },

  async deleteAllByUserId(userId: string) {
    return await notificationsModel.deleteMany({ $or: [{ userId }, { actorId: userId }] }).exec();
  },
};
