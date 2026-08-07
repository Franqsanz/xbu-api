import { Types } from 'mongoose';
import booksModel from '../../src/models/books';

export interface SeedBookInput {
  title?: string;
  userId?: string;
  pathUrl?: string;
  authors?: string[];
  synopsis?: string;
  category?: string[];
  language?: string;
  year?: number;
  numberPages?: number;
  format?: string;
  image?: { url: string; public_id: string };
}

export interface SeededBook {
  _id: Types.ObjectId;
  id: string;
  userId: string;
  pathUrl: string;
}

/**
 * Crea un libro en Mongo con defaults sensatos y devuelve un objeto con
 * tipos concretos para `_id` (evita el `unknown` del `booksModel.create`).
 */
export async function seedBook(input: SeedBookInput = {}): Promise<SeededBook> {
  const doc = await booksModel.create({
    title: input.title ?? 'Un libro',
    authors: input.authors ?? ['A'],
    synopsis: input.synopsis ?? 's',
    category: input.category ?? ['c'],
    language: input.language ?? 'Español',
    year: input.year ?? 2020,
    numberPages: input.numberPages ?? 100,
    format: input.format ?? 'PDF',
    pathUrl: input.pathUrl ?? `book-${new Types.ObjectId().toString()}`,
    image: input.image ?? { url: 'x', public_id: 'p' },
    userId: input.userId ?? 'seeder',
  });

  const _id = doc._id as Types.ObjectId;
  return {
    _id,
    id: _id.toString(),
    userId: (doc as { userId: string }).userId,
    pathUrl: (doc as { pathUrl: string }).pathUrl,
  };
}
