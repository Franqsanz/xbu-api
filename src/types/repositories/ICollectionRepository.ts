import { ICollections } from '../types';

export interface ICollectionOperations {
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
  removeBookRefsFromAll(bookIds: string[]): Promise<any>;
  isBookInAnyCollection(userId: string, bookId: string): Promise<boolean>;
}
