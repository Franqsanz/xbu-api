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
}

// interface Cors {
//   origin: string;
//   callback: (err: Error | null, allow?: boolean) => void;
// }

export { BooksDocument };
