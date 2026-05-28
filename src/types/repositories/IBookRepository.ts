import { IBook, IFindBooks, IDeleteBook } from '../types';

export interface IReadBook {
  findBooks(limit: number, offset: number): Promise<IFindBooks>;
  findById(id: string): Promise<IBook | null>;
  findBySlug(slug: string): Promise<IBook | null>;
  findBySlugUpdateViewFavorite(slug: string, userId: string): Promise<IBook[] | null>;
  findBySlugFavorite(slug: string, userId?: string | undefined): Promise<IBook[] | null>;
  findSearch(q: object | string | undefined): Promise<IBook[]>;
  findByGroupFields(): Promise<IBook[]>;
  findBooksRandom(id: string): Promise<IBook[]>;
  findRelatedBooks(id: string): Promise<IBook[]>;
  findMoreBooksAuthors(id: string): Promise<IBook[]>;
  findMostViewedBooks(detail: string | undefined): Promise<IBook[]>;
  findOptionsFiltering(
    authors: string,
    category: string,
    year: string,
    language: string,
    limit?: number,
    offset?: number
  ): Promise<IFindBooks>;
}

export interface IWriteBook {
  createBook(body: any, buffer?: any): Promise<IBook>;
  updateBook(id: string, body: any, image?: any, buffer?: any): Promise<IBook | null>;
  removeBook(id: string): Promise<IDeleteBook>;
}

export type IRepositoryBook = IReadBook & IWriteBook;
