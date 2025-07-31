import { commentRepository } from '../repositories/commetRepository';
import { ICommentService } from '../types/IRepository';

export const commentService: ICommentService = {
  async findAll(bookId, limit = 10, offset = 0) {
    try {
      return await commentRepository.findAll(bookId, limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async findByUserId(userId, limit = 10, offset = 0) {
    try {
      return await commentRepository.findByUserId(userId, limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async findById(commentId) {
    try {
      return await commentRepository.findById(commentId);
    } catch (err) {
      throw err;
    }
  },

  async create(commentData) {
    try {
      // const commentData = {
      //   text,
      //   author: {
      //     userId,
      //     username
      //   },
      //   bookId,
      //   reactions: [],
      //   likesCount: 0,
      //   dislikesCount: 0,
      //   isEdited: false
      // };

      return await commentRepository.create(commentData);
    } catch (err) {
      throw err;
    }
  },

  async update(commentId, userId, text) {
    try {
      // Validar que el comentario existe y pertenece al usuario
      const existingComment = await commentRepository.findById(commentId);

      if (!existingComment) {
        throw new Error('Comentario no encontrado');
      }

      if (existingComment.author.userId.toString() !== userId) {
        throw new Error('No tienes permisos para editar este comentario');
      }

      return await commentRepository.update(commentId, userId, text);
    } catch (err) {
      throw err;
    }
  },

  async delete(commentId, userId) {
    try {
      // Validar que el comentario existe y pertenece al usuario
      const existingComment = await commentRepository.findById(commentId);

      if (!existingComment) {
        throw new Error('Comentario no encontrado');
      }

      if (existingComment.author.userId.toString() !== userId) {
        throw new Error('No tienes permisos para eliminar este comentario');
      }

      return await commentRepository.delete(commentId, userId);
    } catch (err) {
      throw err;
    }
  },

  async addReaction(commentId, userId, reactionType) {
    try {
      const existingComment = await commentRepository.findById(commentId);

      if (!existingComment) {
        throw new Error('Comentario no encontrado');
      }

      if (!['like', 'dislike'].includes(reactionType)) {
        throw new Error('Tipo de reacción inválida');
      }

      // Verificar si el usuario ya tiene una reacción
      const userReaction = existingComment.reactions.find((r) => r.userId.toString() === userId);

      // Si ya tiene la misma reacción, la removemos
      if (userReaction && userReaction.type === reactionType) {
        return await commentRepository.removeReaction(commentId, userId);
      }

      // Si no tiene reacción o es diferente, agregamos/cambiamos
      return await commentRepository.addReaction(commentId, userId, reactionType);
    } catch (err) {
      throw err;
    }
  },

  async removeReaction(commentId, userId) {
    try {
      const existingComment = await commentRepository.findById(commentId);

      if (!existingComment) {
        throw new Error('Comentario no encontrado');
      }

      return await commentRepository.removeReaction(commentId, userId);
    } catch (err) {
      throw err;
    }
  },

  async findStats(bookId) {
    try {
      return await commentRepository.findStats(bookId);
    } catch (err) {
      throw err;
    }
  },

  // =============================================
  // HELPER METHODS
  // =============================================

  async getUserReaction(commentId, userId) {
    try {
      const comment = await commentRepository.findById(commentId);

      if (!comment) {
        return null;
      }

      const userReaction = comment.reactions.find((r) => r.userId.toString() === userId);

      return userReaction ? userReaction.type : null;
    } catch (err) {
      throw err;
    }
  },

  // async validateCommentOwnership(commentId, userId) {
  //   try {
  //     const comment = await commentRepository.findById(commentId);

  //     if (!comment) {
  //       throw new Error('Comentario no encontrado');
  //     }

  //     if (comment.author.userId.toString() !== userId) {
  //       throw new Error('No tienes permisos para esta acción');
  //     }

  //     return comment;
  //   } catch (err) {
  //     throw err;
  //   }
  // },
};
