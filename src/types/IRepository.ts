import { DecodedIdToken } from 'firebase-admin/auth';

import {
  IBook,
  IFindBooks,
  IDeleteBook,
  IUser,
  IUserAndBooks,
  IUserToSave,
  ICollections,
} from './types';

interface IReadBook {
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

interface IWriteBook {
  createBook(body: any): Promise<IBook>;
  updateBook(id: string, body: any, image?: any): Promise<IBook | null>;
  removeBook(id: string): Promise<IDeleteBook>;
}

interface IReadUser {
  findUsers(): Promise<IUser[]>;
  findById(userId: string): Promise<IUser | null>;
  findByUid?(uid: string): Promise<IUser | null>;
  findUserAndBooks(username: string, limit: number, offset: number): Promise<IUserAndBooks>;
  findBooksByUserId?(userId: string): Promise<IBook[]>;
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

interface IFirebaseUserOperations {
  saveUser(
    decodedToken: DecodedIdToken,
    username: string
  ): Promise<{ existingUser: IUser | null; saveUser: IUser }>;
  deleteAccount(userId: string): Promise<void>;
}

interface IFavoriteOperations {
  findBySlugFavorite(slug: string, userId?: string | undefined): Promise<IBook[] | null>;
  findAllBookFavoriteByUser(userId: string, limit: number, offset: number): Promise<IFindBooks>;
  addFavorite(userId: string, id: string): Promise<IBook | null>;
  removeFavorite(userId: string, id: string): Promise<IBook | null>;
  deleteUserFavorites(userId: string): Promise<any>;
}

interface ICollectionOperations {
  findAllCollections(userId: string): Promise<any>;
  findOneCollection(collectionId: string): Promise<any>;
  findCollectionsForUser(userId: string, bookId: string): Promise<any>;
  saveCollections?(userId: string, name: string): Promise<ICollections>;
  createCollections?(userId: string, name: string): Promise<ICollections>;
  updateCollectionName(userId: string, collectionId: string, name: string): Promise<any>;
  addBookToCollection(
    userId: string,
    collectionId: string[],
    bookId: string,
    checked: boolean
  ): Promise<any>;
  removeBookFromCollection(userId: string, collectionId: string[], bookId: string): Promise<any>;
  deleteCollections(userId: string, collectionId: string): Promise<any>;
  deleteUserCollections(userId: string): Promise<any>;
}

interface IUserService extends IWriteUser, IFavoriteOperations {
  saveUser(
    decodedToken: DecodedIdToken,
    username: string
  ): Promise<{ existingUser: IUser | null; saveUser: IUser }>;
  deleteAccount(userId: string): Promise<void>;
}

export type IRepositoryBook = IReadBook & IWriteBook;
export type IRepositoryUser = IReadUser & IWriteUser;
export type IFullRepositoryUser = IReadUser & IFirebaseUserOperations;

export {
  IUserService,
  IReadUser,
  IFirebaseUserOperations,
  IFavoriteOperations,
  ICollectionOperations,
};
