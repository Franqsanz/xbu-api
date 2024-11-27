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

export {
  IBook,
  IFindBooks,
  IDeleteBook,
  IUser,
  IUserAndBooks,
  IUserToSave,
  IFavorite,
  ICollections,
  IHttpError,
  Pagination,
  PaginationInfo,
};
