import pkg from 'mongoose';

interface BooksDocument extends pkg.Document {
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
}

interface UsersDocument extends pkg.Document {
  uid: string;
  username: string;
  name: string;
  picture: string;
  email: string;
  createdAt: Date;
}

// interface Cors {
//   origin: string;
//   callback: (err: Error | null, allow?: boolean) => void;
// }

export { BooksDocument, UsersDocument };
