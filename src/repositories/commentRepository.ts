import commentsModel from '../models/comments';
import { IRepositoryComment } from '../types/repositories/ICommentRepository';

export const commentRepository: IRepositoryComment = {
  async findAll(bookId, limit, offset) {
    // Sólo los comentarios top-level (sin `parentId`). Las respuestas se
    // piden aparte por `findReplies(commentId)`.
    const filter = { bookId, parentId: null };
    const results = await commentsModel
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
      .exec();

    const totalComments = await commentsModel.countDocuments(filter);

    return {
      totalComments,
      results,
    };
  },

  async findAllByCursor(bookId: string, cursor: { date: Date; id: string } | null, limit: number) {
    const filter: any = { bookId, parentId: null };
    if (cursor) {
      filter.$or = [
        { createdAt: { $lt: cursor.date } },
        { createdAt: cursor.date, _id: { $lt: cursor.id } },
      ];
    }
    const results = await commentsModel
      .find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit)
      .lean()
      .exec();

    const totalComments = cursor
      ? null
      : await commentsModel.countDocuments({ bookId, parentId: null });

    return { totalComments, results };
  },

  async findReplies(parentId, limit, offset) {
    // Las respuestas se ordenan asc para leerse cronológicamente.
    const filter = { parentId };
    const results = await commentsModel
      .find(filter)
      .sort({ createdAt: 1 })
      .limit(limit)
      .skip(offset)
      .lean()
      .exec();

    const total = await commentsModel.countDocuments(filter);

    return { results, total };
  },

  async findById(commentId) {
    const comment = await commentsModel.findById(commentId).lean().exec();

    return comment;
  },

  async findByUserId(userId, limit, offset) {
    const comments = await commentsModel
      .find({ 'author.userId': userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
      .exec();

    return comments;
  },

  async create(commentData) {
    const newComment = new commentsModel(commentData);
    const saved = await newComment.save();

    // Si es una respuesta, incrementamos `repliesCount` del padre.
    if (commentData?.parentId) {
      await commentsModel.updateOne({ _id: commentData.parentId }, { $inc: { repliesCount: 1 } });
    }

    return saved;
  },

  async update(commentId, userId, text) {
    const updatedComment = await commentsModel
      .findOneAndUpdate(
        {
          _id: commentId,
          'author.userId': userId,
        },
        {
          text,
          isEdited: true,
        },
        {
          new: true,
          lean: true,
        }
      )
      .exec();

    return updatedComment;
  },

  async delete(commentId, userId) {
    const deletedComment = await commentsModel
      .findOneAndDelete({
        _id: commentId,
        'author.userId': userId,
      })
      .lean()
      .exec();

    if (deletedComment) {
      if (deletedComment.parentId) {
        // Era una respuesta: bajamos el contador del padre.
        await commentsModel.updateOne(
          { _id: deletedComment.parentId },
          { $inc: { repliesCount: -1 } }
        );
      } else {
        // Era top-level: borramos también sus respuestas para no dejar
        // huérfanas.
        await commentsModel.deleteMany({ parentId: commentId }).exec();
      }
    }

    return deletedComment;
  },

  async addReaction(commentId, userId, type) {
    // Remover reacción previa del usuario
    await commentsModel.updateOne(
      { _id: commentId },
      {
        $pull: {
          reactions: { userId },
        },
      }
    );

    // Agregar nueva reacción
    const updatedComment = await commentsModel
      .findByIdAndUpdate(
        commentId,
        {
          $push: {
            reactions: { userId, type },
          },
        },
        { new: true, lean: true }
      )
      .exec();

    if (updatedComment) {
      // Recalcular contadores
      const likesCount = updatedComment.reactions.filter((r) => r.type === 'like').length;
      const dislikesCount = updatedComment.reactions.filter((r) => r.type === 'dislike').length;

      const finalComment = await commentsModel
        .findByIdAndUpdate(commentId, { likesCount, dislikesCount }, { new: true, lean: true })
        .select('-reactions')
        .exec();

      return finalComment;
    }

    return null;
  },

  async removeReaction(commentId, userId) {
    // Remover la reacción del usuario
    await commentsModel.updateOne(
      { _id: commentId },
      {
        $pull: {
          reactions: { userId },
        },
      }
    );

    // Obtener comentario y recalcular contadores
    const updatedComment = await commentsModel.findById(commentId).lean().exec();

    if (updatedComment) {
      const likesCount = updatedComment.reactions.filter((r) => r.type === 'like').length;
      const dislikesCount = updatedComment.reactions.filter((r) => r.type === 'dislike').length;

      const finalComment = await commentsModel
        .findByIdAndUpdate(commentId, { likesCount, dislikesCount }, { new: true, lean: true })
        .select('-reactions')
        .exec();

      return finalComment;
    }

    return null;
  },

  async findStats(bookId) {
    const stats = await commentsModel
      .aggregate([
        {
          $match: { bookId },
        },
        {
          $group: {
            _id: null,
            totalComments: { $sum: 1 },
            totalLikes: { $sum: '$likesCount' },
            totalDislikes: { $sum: '$dislikesCount' },
          },
        },
      ])
      .exec();

    if (stats.length > 0) {
      return {
        totalComments: stats[0].totalComments,
        totalLikes: stats[0].totalLikes,
        totalDislikes: stats[0].totalDislikes,
      };
    }

    return {
      totalComments: 0,
      totalLikes: 0,
      totalDislikes: 0,
    };
  },

  async deleteAllByUserId(userId) {
    const result = await commentsModel.deleteMany({
      'author.userId': userId,
    });

    return result.deletedCount > 0;
  },

  async countByUserId(userId) {
    return await commentsModel.countDocuments({ 'author.userId': userId }).exec();
  },

  async deleteAllByBookIds(bookIds) {
    if (bookIds.length === 0) return false;
    const result = await commentsModel.deleteMany({
      bookId: { $in: bookIds },
    });

    return result.deletedCount > 0;
  },

  async removeAllReactionsByUserId(userId) {
    await commentsModel.updateMany({ 'reactions.userId': userId }, [
      {
        $set: {
          reactions: {
            $filter: {
              input: '$reactions',
              as: 'r',
              cond: { $ne: ['$$r.userId', userId] },
            },
          },
        },
      },
      {
        $set: {
          likesCount: {
            $size: {
              $filter: {
                input: '$reactions',
                as: 'r',
                cond: { $eq: ['$$r.type', 'like'] },
              },
            },
          },
          dislikesCount: {
            $size: {
              $filter: {
                input: '$reactions',
                as: 'r',
                cond: { $eq: ['$$r.type', 'dislike'] },
              },
            },
          },
        },
      },
    ]);
  },
};
