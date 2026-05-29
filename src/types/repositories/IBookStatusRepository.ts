import { IBook, IBookStatus, BookStatusValue } from '../types';

export interface IBookStatusOperations {
  getStatus(userId: string, bookId: string): Promise<IBookStatus | null>;
  setStatus(userId: string, bookId: string, status: BookStatusValue): Promise<IBookStatus | null>;
  deleteStatus(userId: string, bookId: string): Promise<{ deletedCount?: number }>;
  deleteAllByUserId(userId: string): Promise<{ deletedCount?: number }>;
  deleteAllByBookIds(bookIds: string[]): Promise<{ deletedCount?: number }>;
  listByUserAndStatus(
    userId: string,
    status: BookStatusValue,
    limit?: number,
    offset?: number
  ): Promise<{ items: IBookStatus[]; total: number }>;
  listBooksByUserAndStatus(
    userId: string,
    status: BookStatusValue,
    limit?: number,
    offset?: number
  ): Promise<{ results: IBook[]; totalBooks: number }>;
}
