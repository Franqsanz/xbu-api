import pkg from 'mongoose';

interface BooksDocument extends pkg.Document {
  title: string;
  author: string;
  synopsis: string;
  category: string;
  year: number;
  language: number;
  sourceLink: string;
  numberPages: string;
  format: string;
  image: string;
}

// interface Cors {
//   origin: string;
//   callback: (err: Error | null, allow?: boolean) => void;
// }

export { BooksDocument };
