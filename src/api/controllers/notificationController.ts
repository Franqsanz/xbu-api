import { Request, Response, NextFunction } from 'express';

import { NotificationService } from '../../services/notificationService';
import { BadRequest } from '../../utils/errors';

async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { limit = 20, offset = 0 } = req.query;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const parsedLimit = parseInt(limit as string);
    const parsedOffset = parseInt(offset as string);
    const { notifications, total } = await NotificationService.listForUser(
      userId,
      parsedLimit,
      parsedOffset
    );

    const nextPage =
      parsedOffset + notifications.length < total ? parsedOffset / parsedLimit + 1 : null;

    return res.status(200).json({
      notifications,
      info: {
        total,
        limit: parsedLimit,
        offset: parsedOffset,
        nextPage,
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const count = await NotificationService.countUnread(userId);
    return res.status(200).json({ count });
  } catch (err) {
    return next(err) as any;
  }
}

async function markRead(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { notificationId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const updated = await NotificationService.markAsRead(notificationId, userId);
    if (!updated) {
      return res.status(404).json({
        error: { status: 404, message: 'Notificación no encontrada' },
      });
    }
    return res.status(200).json({ success: { status: 200, message: 'Marcada como leída' } });
  } catch (err) {
    return next(err) as any;
  }
}

async function setReadStatus(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { notificationId } = req.params;
  const { read } = req.body as { read?: boolean };

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }
  if (typeof read !== 'boolean') {
    throw BadRequest('Campo "read" requerido (boolean)');
  }

  try {
    const updated = await NotificationService.setReadStatus(notificationId, userId, read);
    if (!updated) {
      return res.status(404).json({
        error: { status: 404, message: 'Notificación no encontrada' },
      });
    }
    return res.status(200).json({
      success: {
        status: 200,
        message: read ? 'Marcada como leída' : 'Marcada como no leída',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;
  const { notificationId } = req.params;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    const deleted = await NotificationService.deleteOne(notificationId, userId);
    if (!deleted) {
      return res.status(404).json({
        error: { status: 404, message: 'Notificación no encontrada' },
      });
    }
    return res.status(200).json({ success: { status: 200, message: 'Notificación eliminada' } });
  } catch (err) {
    return next(err) as any;
  }
}

async function markAllRead(req: Request, res: Response, next: NextFunction): Promise<any> {
  const userId = req.user?.uid;

  if (!userId) {
    throw BadRequest('Usuario no autenticado');
  }

  try {
    await NotificationService.markAllAsRead(userId);
    return res
      .status(200)
      .json({ success: { status: 200, message: 'Todas marcadas como leídas' } });
  } catch (err) {
    return next(err) as any;
  }
}

export {
  listNotifications,
  getUnreadCount,
  markRead,
  setReadStatus,
  deleteNotification,
  markAllRead,
};
