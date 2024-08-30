import { DecodedIdToken } from 'firebase-admin/auth';
import { IBook, IFindBooks, IDeleteBook, IUser, IUserAndBooks, IUserToSave } from './types';

interface IReadBook {
  findBooks(limit: number, offset: number): Promise<IFindBooks>;
  findById(id: string): Promise<IBook | null>;
  findBySlug(slug: string): Promise<IBook | null>;
  findBySlugUpdateViewFavorite(slug: string, userId: string): Promise<IBook[] | null>;
  findBySlugFavorite(slug: string, userId?: string | undefined): Promise<IBook[] | null>;
  findSearch(q: object | string | undefined): Promise<IBook[]>;
  findByGroupFields(): Promise<IBook[]>;
  findBooksRandom(): Promise<IBook[]>;
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
  addFavorite(userId: string, id: string): Promise<IBook | null>;
  removeFavorite(userId: string, id: string): Promise<IBook | null>;
}

interface IWriteBook {
  createBook(body: any): Promise<IBook>;
  updateBook(id: string, body: any, image?: any): Promise<IBook | null>;
  removeBook(id: string): Promise<IDeleteBook>;
}

interface IReadUser {
  findUsers(): Promise<IUser[]>;
  findById(userId: string): Promise<IUser | null>;
  findByUid(uid: string): Promise<IUser | null>;
  findUserAndBooks(username: string, limit: number, offset: number): Promise<IUserAndBooks>;
  findBooksByUserId(userId: string): Promise<IBook[]>;
  findAllBookFavoriteByUser(userId: string, limit: number, offset: number): Promise<IFindBooks>;
}

interface IWriteUser {
  createUser(userToSave: IUserToSave): Promise<IUser>;
  saveUser?(
    decodedToken: DecodedIdToken,
    username: string
  ): Promise<{ existingUser: IUser | null; saveUser: IUser }>;
  deleteUserBooks(id: any): Promise<any>;
  deleteUser(userId: any): Promise<any>;
  deleteAccount?(userId: string): Promise<void>;
}

interface IUserService extends IWriteUser {
  saveUser(
    decodedToken: DecodedIdToken,
    username: string
  ): Promise<{ existingUser: IUser | null; saveUser: IUser }>;
  deleteAccount(userId: string): Promise<void>;
}

// type IUserService = Omit<IWriteUser, 'findByUid' | 'findBooksByUserId' | 'createUser' | 'deleteUser' | 'deleteUserBooks'> & IReadUser;

export type IRepositoryBook = IReadBook & IWriteBook;
export type IRepositoryUser = IReadUser & IWriteUser;

export { IUserService, IReadUser };
