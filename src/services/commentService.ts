import { commentRepository } from '../repositories/commentRepository';
import { UserRepository } from '../repositories/userRepository';
import { NotificationService } from './notificationService';
import { NotificationRepository } from '../repositories/notificationRepository';
import { ICommentService } from '../types/repositories/ICommentRepository';
import { commentSchema } from '../utils/validation';

export const commentService: ICommentService = {
  async findAll(bookId, limit = 10, offset = 0) {
    return await commentRepository.findAll(bookId, limit, offset);
  },

  async findByUserId(userId, limit = 10, offset = 0) {
    return await commentRepository.findByUserId(userId, limit, offset);
  },

  async findById(commentId) {
    return await commentRepository.findById(commentId);
  },

  async findStats(bookId) {
    return await commentRepository.findStats(bookId);
  },

  async deleteAllByUserId(userId) {
    return await commentRepository.deleteAllByUserId(userId);
  },

  async countByUserId(userId) {
    return await commentRepository.countByUserId(userId);
  },

  async deleteAllByBookIds(bookIds) {
    return await commentRepository.deleteAllByBookIds(bookIds);
  },

  async removeAllReactionsByUserId(userId) {
    return await commentRepository.removeAllReactionsByUserId(userId);
  },

  async create(commentData) {
    const validatedData = commentSchema.parse(commentData);

    const user = await UserRepository.findById(validatedData.author.userId);
    if (!user) {
      throw new Error('Usuario no encontrado');
    }

    const commentToCreate = {
      text: validatedData.text,
      bookId: validatedData.bookId,
      author: {
        userId: user.uid,
        name: user.name,
        username: user.username,
        avatar: user.picture,
      },
    };

    return await commentRepository.create(commentToCreate);
  },

  async update(commentId, userId, text) {
    const existingComment = await commentRepository.findById(commentId);
    if (!existingComment) {
      throw new Error('Comentario no encontrado');
    }
    if (existingComment.author.userId.toString() !== userId) {
      throw new Error('No tienes permisos para editar este comentario');
    }

    return await commentRepository.update(commentId, userId, text);
  },

  async delete(commentId, userId) {
    const existingComment = await commentRepository.findById(commentId);
    if (!existingComment) {
      throw new Error('Comentario no encontrado');
    }
    if (existingComment.author.userId.toString() !== userId) {
      throw new Error('No tienes permisos para eliminar este comentario');
    }

    return await commentRepository.delete(commentId, userId);
  },

  async addReaction(commentId, userId, reactionType) {
    const existingComment = await commentRepository.findById(commentId);
    if (!existingComment) {
      throw new Error('Comentario no encontrado');
    }
    if (!['like', 'dislike'].includes(reactionType)) {
      throw new Error('Tipo de reacción inválida');
    }

    const authorId = (existingComment as any).author?.userId;
    const bookId = (existingComment as any).bookId;

    // Si el usuario ya tiene la misma reacción, la removemos (toggle)
    const userReaction = existingComment.reactions.find((r) => r.userId.toString() === userId);
    if (userReaction && userReaction.type === reactionType) {
      const result = await commentRepository.removeReaction(commentId, userId);
      if (authorId && authorId !== userId) {
        NotificationRepository.deleteByActorTypeRef({
          userId: authorId,
          actorId: userId,
          type: 'reaction',
          commentId,
        }).catch((err) =>
          console.error('[commentService.addReaction] failed to delete reaction notification:', err)
        );
      }
      return result;
    }

    const result = await commentRepository.addReaction(commentId, userId, reactionType);

    if (authorId && authorId !== userId) {
      (async () => {
        try {
          await NotificationRepository.deleteByActorTypeRef({
            userId: authorId,
            actorId: userId,
            type: 'reaction',
            commentId,
          });
          await NotificationService.createSafe({
            userId: authorId,
            type: 'reaction',
            actorId: userId,
            bookId,
            commentId,
            reactionType,
          });
        } catch (err) {
          console.error('[commentService.addReaction] notification failed:', err);
        }
      })();
    }

    return result;
  },

  async removeReaction(commentId, userId) {
    const existingComment = await commentRepository.findById(commentId);
    if (!existingComment) {
      throw new Error('Comentario no encontrado');
    }

    return await commentRepository.removeReaction(commentId, userId);
  },
};
