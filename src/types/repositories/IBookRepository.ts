import { IBook, IFindBooks, IDeleteBook } from '../types';

export interface IReadBook {
  findBooks(limit: number, offset: number): Promise<IFindBooks>;
  findBooksByCursor?(
    cursorId: string | null,
    limit: number
  ): Promise<{ results: IBook[]; totalBooks: number | null }>;
  findFilteredBooksByCursor?(
    filters: {
      category?: string;
      authors?: string;
      languages?: string[];
      years?: string[];
      minPages?: number;
      maxPages?: number;
    },
    cursorId: string | null,
    limit: number
  ): Promise<{
    results: IBook[];
    totalBooks?: number;
    languageCounts?: Array<{ language: string; count: number }>;
    yearCounts?: Array<{ year: number; count: number }>;
    pagesCounts?: Array<{ numberPages: number; count: number }>;
    authorsCounts?: Array<{ authors: string; count: number }>;
  }>;
  findById(id: string): Promise<IBook | null>;
  findByIdRaw(id: string): Promise<IBook | null>;
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
  findTopCategoriesByUser(
    userId: string,
    limit: number
  ): Promise<Array<{ name: string; count: number }>>;
  findBooksStatsByUser(userId: string): Promise<{
    totalViews: number;
    mostViewed: { id: string; title: string; pathUrl: string; views: number } | null;
    bookIds: string[];
  }>;
}

export interface IWriteBook {
  createBook(body: any, buffer?: any): Promise<IBook>;
  updateBook(id: string, body: any, image?: any, buffer?: any): Promise<IBook | null>;
  removeBook(id: string): Promise<IDeleteBook>;
}

export type IRepositoryBook = IReadBook & IWriteBook;
