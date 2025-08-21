import commentsModel from '../models/comments';
import { IRepositoryComment } from '../types/IRepository';

export const commentRepository: IRepositoryComment = {
  async findAll(bookId, limit, offset) {
    const results = await commentsModel
      .find({ bookId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .lean()
      .exec();

    const totalComments = await commentsModel.countDocuments({ bookId });

    return {
      totalComments,
      results,
    };
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

    return await newComment.save();
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
};
