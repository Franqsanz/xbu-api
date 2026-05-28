import { IComment, ICommentStats } from '../types';

export interface IReadComment {
  findAll(
    bookId: string,
    limit: number,
    offset: number
  ): Promise<{ results: IComment[]; totalComments: number }>;
  findById(commentId: string): Promise<IComment | null>;
  findByUserId(userId: string, limit: number, offset: number): Promise<IComment[]>;
}

export interface IWriteComment {
  create(commentData: Partial<IComment>): Promise<IComment>;
  update(commentId: string, userId: string, text: string): Promise<IComment | null>;
  delete(commentId: string, userId: string): Promise<IComment | null>;
  deleteAllByUserId(userId: string): Promise<boolean>;
}

export interface ICommentReactions {
  addReaction(
    commentId: string,
    userId: string,
    type: 'like' | 'dislike'
  ): Promise<IComment | null>;
  removeReaction(commentId: string, userId: string): Promise<IComment | null>;
  findStats(bookId: string): Promise<ICommentStats>;
}

export interface ICommentService extends IReadComment, IWriteComment, ICommentReactions {
  getUserReaction?(commentId: string, userId: string): Promise<'like' | 'dislike' | null>;
  validateCommentOwnership?(commentId: string, userId: string): Promise<IComment>;
}

export type IRepositoryComment = IReadComment & IWriteComment & ICommentReactions;
