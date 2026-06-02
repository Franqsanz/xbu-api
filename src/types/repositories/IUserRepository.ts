import { DecodedIdToken } from 'firebase-admin/auth';

import { IBook, IUser, IUserAndBooks, IUserToSave } from '../types';
import { IFavoriteOperations } from './IFavoriteRepository';
import { IFollowOperations } from './IFollowRepository';

export interface IReadUser {
  findUsers(): Promise<IUser[]>;
  findById(userId: string): Promise<IUser | null>;
  findByUid?(uid: string): Promise<IUser | null>;
  findByUsername?(username: string): Promise<IUser | null>;
  findUserAndBooks(username: string, limit: number, offset: number): Promise<IUserAndBooks>;
  findUserByUsernameAndBooks(
    username: string,
    limit: number,
    offset: number
  ): Promise<IUserAndBooks>;
  findBooksByUserId?(userId: string): Promise<IBook[]>;
}

export interface IWriteUser {
  createUser(userToSave: IUserToSave): Promise<IUser>;
  saveUser?(
    decodedToken: DecodedIdToken,
    username: string
  ): Promise<{ existingUser: IUser | null; saveUser: IUser }>;
  updateMe?(
    uid: string,
    updates: Partial<{
      name: string;
      username: string;
      bio: string;
      picture: string;
      pictureId: string;
    }>
  ): Promise<IUser | null>;
  deleteUserBooks(id: any): Promise<any>;
  deleteUser(userId: any): Promise<any>;
  deleteAccount?(userId: string): Promise<void>;
}

export interface IFirebaseUserOperations {
  saveUser(
    decodedToken: DecodedIdToken,
    username: string
  ): Promise<{ existingUser: IUser | null; saveUser: IUser }>;
  deleteAccount(userId: string): Promise<void>;
}

export interface IProfileEditOperations {
  checkUsernameAvailability(
    username: string,
    currentUid?: string
  ): Promise<{ ok: true } | { ok: false; reason: 'format' | 'reserved' | 'taken' }>;
  updateMe(
    uid: string,
    updates: { name?: string; username?: string; bio?: string },
    avatarBuffer?: Buffer
  ): Promise<IUser | null>;
}

export interface IUserService extends IWriteUser, IFavoriteOperations, IFollowOperations {
  saveUser(
    decodedToken: DecodedIdToken,
    username: string
  ): Promise<{ existingUser: IUser | null; saveUser: IUser }>;
  deleteAccount(userId: string): Promise<void>;
}

export type IRepositoryUser = IReadUser & IWriteUser;
export type IFullRepositoryUser = IReadUser &
  IFirebaseUserOperations &
  IFollowOperations &
  IProfileEditOperations;
