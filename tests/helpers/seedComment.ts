import { Types } from 'mongoose';
import commentsModel from '../../src/models/comments';

export interface SeedCommentInput {
  text?: string;
  bookId: string;
  parentId?: string;
  replyToId?: string;
  repliesCount?: number;
  author?: {
    userId: string;
    name?: string;
    username?: string;
    avatar?: string;
  };
}

export interface SeededComment {
  _id: Types.ObjectId;
  id: string;
  bookId: string;
  parentId: string | null;
}

/**
 * Crea un comentario en Mongo con defaults y tipa `_id` concretamente para
 * que los tests puedan interpolarlo en URLs sin castings.
 */
export async function seedComment(input: SeedCommentInput): Promise<SeededComment> {
  const author = input.author ?? {
    userId: 'author-seed',
    name: 'Seed',
    username: 'seed',
    avatar: '',
  };
  const doc = await commentsModel.create({
    text: input.text ?? 'seed comment',
    bookId: input.bookId,
    parentId: input.parentId ?? null,
    replyToId: input.replyToId ?? null,
    repliesCount: input.repliesCount ?? 0,
    author: {
      userId: author.userId,
      name: author.name ?? 'Seed',
      username: author.username ?? 'seed',
      avatar: author.avatar ?? '',
    },
  });

  const _id = doc._id as Types.ObjectId;
  return {
    _id,
    id: _id.toString(),
    bookId: input.bookId,
    parentId: input.parentId ?? null,
  };
}
