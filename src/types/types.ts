import { DecodedIdToken } from 'firebase-admin/auth';
import pkg from 'mongoose';

interface IBook extends pkg.Document {
  title: string;
  authors: string[];
  synopsis: string;
  category: string[];
  year: number;
  language: number;
  sourceLink: string;
  numberPages: string;
  format: string;
  pathUrl: string;
  image: {
    url: string;
    public_id: string;
  };
  userId: string;
  views: number;
}

interface IFindBooks {
  results: IBook[];
  totalBooks: number;
  yearCounts?: number;
  languageCounts?: number;
  pagesCounts?: number;
  authorsCounts?: number;
}

interface IDeleteBook {
  book: IBook | null;
  deleteOne: any;
}

interface IUser extends pkg.Document {
  uid: string;
  username: string;
  name: string;
  picture: string;
  pictureId?: string;
  bio?: string;
  email: string;
  createdAt: Date;
}

interface IUserAndBooks {
  user: IUser | null;
  results: IBook[];
  totalBooks: number;
}

interface IUserToSave extends DecodedIdToken {
  username: string;
  createdAt: Date;
}

interface IFavorite {
  userId: string;
  favoriteBooks: pkg.Schema.Types.ObjectId[];
}

interface ICollections {
  userId: string;
  collections: {
    name: string;
    id?: pkg.Schema.Types.ObjectId;
    books: {
      bookId: pkg.Schema.Types.ObjectId;
      checked: boolean;
    }[];
    createdAt?: Date;
  }[];
}

interface IReaction {
  userId: string;
  type: 'like' | 'dislike';
}

interface IAuthor {
  userId: string;
  name: string;
  username: string;
  avatar: string;
}

interface IComment extends pkg.Document {
  text: string;
  author: IAuthor;
  bookId: string;
  reactions: IReaction[];
  likesCount: number;
  dislikesCount: number;
  isEdited: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface ICommentStats {
  totalComments: number;
  totalLikes: number;
  totalDislikes: number;
}

interface IHttpError extends Error {
  statusCode: number;
}

interface Pagination {
  page: number;
  limit: number;
  offset: number;
}

interface PaginationInfo {
  totalBooks: number;
  totalPages: number;
  languageCounts?: number;
  yearCounts?: number;
  pagesCounts?: number;
  authorsCounts?: number;
  currentPage: number;
  nextPage: number | null;
  prevPage: number | null;
  nextPageLink: string | null;
  prevPageLink: string | null;
}

interface IFollowStats {
  followersCount: number;
  followingCount: number;
}

interface IFollowUser {
  uid: string;
  username: string;
  name: string;
  picture?: string;
  isFollowing: boolean;
}

interface IFollowData {
  followers: IFollowUser[];
  totalFollowers: number;
}

interface IFollowingData {
  following: IFollowUser[];
  totalFollowing: number;
}

type BookStatusValue = 'read' | 'reading' | 'want_to_read';

interface IBookStatus {
  userId: string;
  bookId: string;
  status: BookStatusValue;
  createdAt?: Date;
  updatedAt?: Date;
}

export {
  IBook,
  IFindBooks,
  IDeleteBook,
  IUser,
  IUserAndBooks,
  IUserToSave,
  IFavorite,
  ICollections,
  IComment,
  ICommentStats,
  IHttpError,
  Pagination,
  PaginationInfo,
  IFollowStats,
  IFollowData,
  IFollowingData,
  IBookStatus,
  BookStatusValue,
};
