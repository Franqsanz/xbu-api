import { Types } from 'mongoose';

import usersModel from '../models/users';
import booksModel from '../models/books';
import {
  NotificationRepository,
  CreateNotificationInput,
  NotificationType,
} from '../repositories/notificationRepository';

type ActorSummary = {
  username: string;
  name: string;
  picture?: string;
};

type BookSummary = {
  title: string;
  pathUrl: string;
  image?: { url: string };
};

export type EnrichedNotification = {
  id: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  rating?: number;
  reactionType?: 'like' | 'dislike';
  actor: ActorSummary | null;
  book?: BookSummary | null;
};

async function enrichNotifications(results: any[]): Promise<EnrichedNotification[]> {
  const actorUids = Array.from(new Set(results.map((n: any) => n.actorId)));
  const bookIds = Array.from(
    new Set(results.filter((n: any) => n.bookId).map((n: any) => n.bookId))
  );

  const [actors, books] = await Promise.all([
    actorUids.length > 0
      ? usersModel
          .find({ uid: { $in: actorUids } })
          .select('uid username name picture')
          .lean()
          .exec()
      : Promise.resolve([]),
    bookIds.length > 0
      ? booksModel
          .find({
            _id: {
              $in: bookIds
                .filter((id: string) => Types.ObjectId.isValid(id))
                .map((id: string) => new Types.ObjectId(id)),
            },
          })
          .select('title pathUrl image')
          .lean()
          .exec()
      : Promise.resolve([]),
  ]);

  const actorByUid = new Map<string, ActorSummary>(
    actors.map((u: any) => [u.uid, { username: u.username, name: u.name, picture: u.picture }])
  );
  const bookById = new Map<string, BookSummary>(
    books.map((b: any) => [
      b._id.toString(),
      {
        title: b.title,
        pathUrl: b.pathUrl,
        image: b.image ? { url: b.image.url } : undefined,
      },
    ])
  );

  return results.map((n: any) => ({
    id: n._id.toString(),
    type: n.type,
    read: n.read,
    createdAt: n.createdAt,
    rating: n.rating,
    reactionType: n.reactionType,
    actor: actorByUid.get(n.actorId) ?? null,
    book: n.bookId ? (bookById.get(n.bookId) ?? null) : undefined,
  }));
}

export const NotificationService = {
  /**
   * Crea una notificación. Skip si el actor es el mismo usuario (no se auto-notifica).
   * Fire-and-forget desde los triggers: errores se loguean pero no rompen la acción principal.
   */
  async createSafe(input: CreateNotificationInput): Promise<void> {
    if (input.userId === input.actorId) return;
    try {
      await NotificationRepository.create(input);
    } catch (err) {
      console.error('[NotificationService] createSafe error:', err);
    }
  },

  /**
   * Modo offset — pensado para backoffice / paginación numerada.
   * El total siempre se calcula (no es opcional como en cursor).
   */
  async listForUser(userId: string, limit: number, offset: number) {
    const { results, total } = await NotificationRepository.findByUser(userId, limit, offset);
    const enriched = await enrichNotifications(results);
    return { notifications: enriched, total };
  },

  async listForUserByCursor(
    userId: string,
    cursor: { date: Date; id: string } | null,
    limit: number
  ) {
    const { results, total } = await NotificationRepository.findByUserByCursor(
      userId,
      cursor,
      limit
    );
    const enriched = await enrichNotifications(results);
    return { notifications: enriched, total, rawResults: results };
  },

  async countUnread(userId: string) {
    return await NotificationRepository.countUnread(userId);
  },

  async markAsRead(notificationId: string, userId: string) {
    return await NotificationRepository.markAsRead(notificationId, userId);
  },

  async setReadStatus(notificationId: string, userId: string, read: boolean) {
    return await NotificationRepository.setReadStatus(notificationId, userId, read);
  },

  async markAllAsRead(userId: string) {
    return await NotificationRepository.markAllAsRead(userId);
  },

  async deleteOne(notificationId: string, userId: string) {
    return await NotificationRepository.deleteOne(notificationId, userId);
  },
};
