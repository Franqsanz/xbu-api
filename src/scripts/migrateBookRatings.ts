import mongoose from 'mongoose';

import connect from '../db/connection';
import booksModel from '../models/books';
import bookRatingsModel from '../models/bookRatings';

/**
 * Migración one-shot: convierte el campo legacy `books.rating` (rating
 * asignado por el creador desde el form de publicación) en un doc en
 * la colección `bookRatings` para que cuente como voto del creador.
 *
 * Idempotente: si el creador ya tiene un rating en bookRatings para
 * ese libro, lo deja como está.
 */
async function migrate() {
  await connect();

  const books = await booksModel
    .find({ rating: { $gt: 0 }, userId: { $exists: true, $ne: null } }, '_id userId rating')
    .lean()
    .exec();

  console.log(`Found ${books.length} books with legacy rating > 0`);

  let migrated = 0;
  let skipped = 0;
  let invalid = 0;

  for (const book of books) {
    const bookId = (book as any)._id.toString();
    const userId = (book as any).userId;
    const ratingRaw = (book as any).rating;
    const rating = Math.round(ratingRaw);

    if (!userId || rating < 1 || rating > 5) {
      invalid++;
      continue;
    }

    const existing = await bookRatingsModel.findOne({ userId, bookId }).lean().exec();
    if (existing) {
      skipped++;
      continue;
    }

    await bookRatingsModel.create({ userId, bookId, rating });
    migrated++;
  }

  console.log(`Migrated: ${migrated}, Already existed: ${skipped}, Invalid: ${invalid}`);

  await mongoose.disconnect();
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
