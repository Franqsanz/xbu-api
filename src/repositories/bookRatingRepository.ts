import bookRatingsModel from '../models/bookRatings';

export type BookRatingStats = {
  averageRating: number;
  ratingsCount: number;
};

export const BookRatingRepository = {
  async getRating(userId: string, bookId: string): Promise<number | null> {
    const doc = await bookRatingsModel.findOne({ userId, bookId }).lean().exec();
    return doc ? (doc as any).rating : null;
  },

  async setRating(userId: string, bookId: string, rating: number) {
    return await bookRatingsModel
      .findOneAndUpdate({ userId, bookId }, { $set: { rating } }, { new: true, upsert: true })
      .lean()
      .exec();
  },

  async deleteRating(userId: string, bookId: string) {
    return await bookRatingsModel.deleteOne({ userId, bookId }).exec();
  },

  async getStats(bookId: string): Promise<BookRatingStats> {
    const [agg] = await bookRatingsModel
      .aggregate([
        { $match: { bookId } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      .exec();

    if (!agg) return { averageRating: 0, ratingsCount: 0 };
    return {
      averageRating: Math.round(agg.average * 10) / 10,
      ratingsCount: agg.count,
    };
  },

  async getStatsForBooks(bookIds: string[]): Promise<Map<string, BookRatingStats>> {
    if (bookIds.length === 0) return new Map();
    const docs = await bookRatingsModel
      .aggregate([
        { $match: { bookId: { $in: bookIds } } },
        {
          $group: {
            _id: '$bookId',
            average: { $avg: '$rating' },
            count: { $sum: 1 },
          },
        },
      ])
      .exec();

    return new Map(
      docs.map((d: any) => [
        d._id,
        {
          averageRating: Math.round(d.average * 10) / 10,
          ratingsCount: d.count,
        },
      ])
    );
  },

  async getAverageForBookIds(bookIds: string[]): Promise<BookRatingStats> {
    if (bookIds.length === 0) return { averageRating: 0, ratingsCount: 0 };

    const [agg] = await bookRatingsModel
      .aggregate([
        { $match: { bookId: { $in: bookIds } } },
        { $group: { _id: null, average: { $avg: '$rating' }, count: { $sum: 1 } } },
      ])
      .exec();

    if (!agg) return { averageRating: 0, ratingsCount: 0 };
    return {
      averageRating: Math.round(agg.average * 10) / 10,
      ratingsCount: agg.count,
    };
  },

  async deleteAllByUserId(userId: string) {
    return await bookRatingsModel.deleteMany({ userId }).exec();
  },

  async deleteAllByBookIds(bookIds: string[]) {
    if (bookIds.length === 0) return { deletedCount: 0 };
    return await bookRatingsModel.deleteMany({ bookId: { $in: bookIds } }).exec();
  },
};
