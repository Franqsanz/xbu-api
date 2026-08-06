import { Request, Response, NextFunction } from 'express';

import { commentService } from '../../services/commentService';
import { BookService } from '../../services/bookService';
import { NotificationService } from '../../services/notificationService';
import { IComment, ICommentStats } from '../../types/types';
import { BadRequest } from '../../utils/errors';
import { encodeCompositeCursor, decodeCompositeCursor } from '../../utils/cursor';
import { buildPageInfo, isPageMode, parsePageParams } from '../../utils/paginate';

async function findAll(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { bookId } = req.params;

  // Modo offset (`?page=N`) — backoffice / paginación numerada.
  if (isPageMode(req)) {
    const { page, limit, offset } = parsePageParams(req, 5, 50);
    try {
      const { results, totalComments } = await commentService.findAll(bookId, limit, offset);
      const info = buildPageInfo({ req, page, limit, total: totalComments });
      return res.status(200).json({ info: { ...info, totalComments }, results });
    } catch (err) {
      return next(err) as any;
    }
  }

  const rawCursor = (req.query.cursor as string) || null;
  const rawLimit = Number(req.query.limit ?? 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 10;

  const cursor = rawCursor ? decodeCompositeCursor(rawCursor) : null;
  if (rawCursor && !cursor) {
    return next(BadRequest('Cursor inválido.')) as any;
  }

  try {
    const { results, totalComments } = await (commentService as any).findAllByCursor(
      bookId,
      cursor,
      limit
    );

    const last = results[results.length - 1];
    const nextCursor =
      results.length === limit && last
        ? encodeCompositeCursor(last.createdAt, String(last._id))
        : null;
    const nextUrl = nextCursor
      ? `${req.protocol}://${req.hostname}${req.baseUrl}${req.path}?cursor=${nextCursor}&limit=${limit}`
      : null;

    const info: {
      nextCursor: string | null;
      nextUrl: string | null;
      totalComments?: number;
    } = { nextCursor, nextUrl };
    if (totalComments !== null) info.totalComments = totalComments;

    return res.status(200).json({ info, results });
  } catch (err) {
    return next(err) as any;
  }
}

async function findByUserId(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment[]>> {
  const { userId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const comments = await commentService.findByUserId(userId, Number(limit), Number(offset));

    return res.status(200).json(comments);
  } catch (err) {
    return next(err) as any;
  }
}

// export const getCommentById = async (req: Request, res: Response) => {
//   try {
//     const { commentId } = req.params;

//     const comment = await commentService.getCommentById(commentId);

//     if (!comment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Comentario no encontrado'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       data: comment
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al obtener comentario',
//       error: error.message
//     });
//   }
// };

// export const getCommentsStats = async (req: Request, res: Response) => {
//   try {
//     const { contentId } = req.params;

//     const stats = await commentService.getCommentsStats(contentId);

//     res.status(200).json({
//       success: true,
//       data: stats
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al obtener estadísticas',
//       error: error.message
//     });
//   }
// };

async function create(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment>> {
  const { body } = req;

  try {
    const created = await commentService.create(body);

    // Sólo notificamos al autor del libro cuando el comentario es top-level.
    // Si es una respuesta, la notificación relevante va al autor del comment
    // padre (la emite `commentService.create`).
    if (!body?.parentId) {
      (async () => {
        try {
          const book = await BookService.findByIdRaw(body.bookId);
          if (book?.userId && book.userId !== body.author?.userId) {
            await NotificationService.createSafe({
              userId: book.userId,
              type: 'comment',
              actorId: body.author?.userId,
              bookId: body.bookId,
              commentId: (created as any)?._id?.toString(),
            });
          }
        } catch (err) {
          console.error('[commentController.create] notification failed:', err);
        }
      })();
    }

    return res.status(201).json({
      success: {
        status: 201,
        message: 'Comentario creado',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function findReplies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment[]>> {
  const { commentId } = req.params;
  const { limit = 10, offset = 0 } = req.query;

  try {
    const { results, total } = await commentService.findReplies(
      commentId,
      Number(limit),
      Number(offset)
    );
    return res.status(200).json({ results, total });
  } catch (err) {
    return next(err) as any;
  }
}

async function update(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment>> {
  const { commentId, userId } = req.params;
  const { text } = req.body;

  try {
    const updatedComment = await commentService.update(commentId, userId, text.trim());

    if (!updatedComment) {
      return res.status(404).json({
        error: {
          status: 404,
          message: 'Comentario no encontrado',
        },
      });
    }

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Comentario actualizado',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function deleteComment(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment>> {
  const { commentId, userId } = req.params;

  try {
    const deletedComment = await commentService.delete(commentId, userId);

    if (!deletedComment) {
      return res.status(404).json({
        error: {
          status: 404,
          message: 'Comentario no encontrado',
        },
      });
    }

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Comentario eliminado',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

async function addReaction(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<IComment>> {
  const { commentId, userId } = req.params;
  const { type } = req.body;

  try {
    if (!['like', 'dislike'].includes(type)) {
      return res.status(400).json({
        error: {
          status: 400,
          message: 'Tipo de reacción inválido. Debe ser "like" o "dislike"',
        },
      });
    }

    const updatedComment = await commentService.addReaction(commentId, userId, type);

    if (!updatedComment) {
      return res.status(404).json({
        info: {
          status: 404,
          message: 'Comentario no encontrado',
        },
      });
    }

    return res.status(200).json({
      success: {
        status: 200,
        message: 'Reacción agregada',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

// export const removeReaction = async (req: Request, res: Response) => {
//   try {
//     const { commentId } = req.params;
//     const { userId } = req.user;

//     const updatedComment = await commentService.removeReaction(commentId, userId);

//     if (!updatedComment) {
//       return res.status(404).json({
//         success: false,
//         message: 'Comentario no encontrado'
//       });
//     }

//     res.status(200).json({
//       success: true,
//       message: 'Reacción removida exitosamente',
//       data: updatedComment
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al remover reacción',
//       error: error.message
//     });
//   }
// };

async function findStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<Response<ICommentStats>> {
  const { bookId } = req.params;

  try {
    if (!bookId) {
      return res.status(400).json({
        error: {
          status: 400,
          message: 'El ID del contenido es requerido',
        },
      });
    }

    const stats = await commentService.findStats(bookId);

    return res.status(200).json(stats);
  } catch (err) {
    return next(err) as any;
  }
}

// export const getUserReaction = async (req: Request, res: Response) => {
//   try {
//     const { commentId } = req.params;
//     const { userId } = req.user;

//     const reaction = await commentService.getUserReaction(commentId, userId);

//     res.status(200).json({
//       success: true,
//       data: {
//         reaction: reaction
//       }
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Error al obtener reacción del usuario',
//       error: error.message
//     });
//   }
// };

export {
  findAll,
  findReplies,
  findByUserId,
  create,
  update,
  deleteComment,
  addReaction,
  findStats,
};
