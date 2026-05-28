import { IBook, IFindBooks } from '../types';

export interface IFavoriteOperations {
  findBySlugFavorite(slug: string, userId?: string | undefined): Promise<IBook[] | null>;
  findAllBookFavoriteByUser(userId: string, limit: number, offset: number): Promise<IFindBooks>;
  addFavorite(userId: string, id: string): Promise<IBook | null>;
  removeFavorite(userId: string, id: string): Promise<IBook | null>;
  deleteUserFavorites(userId: string): Promise<any>;
}
