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

interface IUser extends pkg.Document {
  uid: string;
  username: string;
  name: string;
  picture: string;
  email: string;
  createdAt: Date;
}

interface UserAndBooks {
  user: IUser | null;
  results: IBook[];
  totalBooks: number;
}

interface IUserToSave extends DecodedIdToken {
  username: string;
  createdAt: Date;
}

export { IBook, IUser, UserAndBooks, IUserToSave };
