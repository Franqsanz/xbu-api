import booksModel from '../models/books';
import { IRepositoryBook } from '../types/repositories/IBookRepository';
import {
  qyGroupOptions,
  qyBooksFiltering,
  qyOneBooks,
  qyPathUrlBooks,
  qySearch,
  qyBooksRandom,
  qyRelatedBooks,
  qyMoreBooksAuthors,
  qyPutBook,
} from '../db/bookQueries';
import { qyPathUrlBooksFavorite } from '../db/userQueries';

export const BookRepository: IRepositoryBook = {
  async findBooks(limit, offset) {
    // Aquí obtenemos los libros de la base de datos usando el método skip y limit
    const results = await booksModel
      .find({}, 'title category language authors pathUrl image views')
      .skip(offset)
      .limit(limit)
      .sort({
        _id: -1,
      })
      .exec();

    // Aquí obtenemos el número total de libros en la base de datos
    const totalBooks = await booksModel.countDocuments();

    return {
      results,
      totalBooks,
    };
  },

  async findById(id) {
    const query = qyOneBooks(id);

    return await booksModel.findByIdAndUpdate(...query).hint('_id_');
  },

  async findByIdRaw(id) {
    return await booksModel.findById(id).lean().exec();
  },

  async findBySlug(slug) {
    const query = qyPathUrlBooks(slug);
    return await booksModel.findOne(...query).exec();
  },

  async findBySlugUpdateViewFavorite(slug, userId) {
    const queryAggregate = qyPathUrlBooksFavorite(slug, userId);

    // Incremento de views fire-and-forget: no bloquea la respuesta.
    // El aggregate devuelve el snapshot previo (1 atrás), aceptable para un counter aprox.
    booksModel
      .updateOne({ pathUrl: slug }, { $inc: { views: 1 } })
      .exec()
      .catch((err) => console.error(`Error updating views for ${slug}:`, err));

    const result = await booksModel.aggregate(queryAggregate).exec();

    // Fallback si el aggregate falla
    if (!result || result.length === 0) {
      console.log('Aggregate returned empty in findBySlugUpdateViewFavorite, using fallback');

      const book = await booksModel.findOne({ pathUrl: slug }).lean().exec();

      if (book) {
        return [
          {
            ...book,
            id: book._id,
            isFavorite: false,
            _id: undefined,
          },
        ];
      }
    }

    return result;
  },

  async findBySlugFavorite(slug, userId) {
    const queryAggregate = qyPathUrlBooksFavorite(slug, userId);
    const result = await booksModel.aggregate(queryAggregate).exec();

    // Fallback si el aggregate falla
    if (!result || result.length === 0) {
      console.log('Aggregate returned empty in findBySlugFavorite, using fallback');

      const book = await booksModel.findOne({ pathUrl: slug }).lean().exec();

      if (book) {
        return [
          {
            ...book,
            id: book._id,
            isFavorite: false,
            _id: undefined,
          },
        ];
      }

      return [];
    }

    return result;
  },

  async findSearch(q) {
    const { query, projection } = qySearch(q);

    return await booksModel.find(query, projection).hint('_id_').sort({ _id: -1 }).exec();
  },

  async findByGroupFields() {
    const query = qyGroupOptions();

    return await booksModel.aggregate(query).exec();
  },

  async findBooksRandom(id) {
    const query = qyBooksRandom(id);

    return await booksModel.aggregate(query);
  },

  async findRelatedBooks(id) {
    const currentBook = await booksModel.findById(id);

    if (currentBook) {
      const { category } = currentBook;
      const selectedCategory = category[0];
      const query = qyRelatedBooks(id, selectedCategory);

      return await booksModel.aggregate(query);
    }

    return [];
  },

  async findMoreBooksAuthors(id) {
    const currentBook = await booksModel.findById(id);

    if (currentBook) {
      const { authors } = currentBook;
      const selectedCategory = authors[0];
      const query = qyMoreBooksAuthors(id, selectedCategory);

      return await booksModel.aggregate(query);
    }

    return [];
  },

  async findMostViewedBooks(detail) {
    if (detail === 'summary') {
      return await booksModel.find({}, ' title pathUrl views').sort({ views: -1 }).limit(10);
    } else if (detail === 'full') {
      return await booksModel
        .find({}, 'title category language authors pathUrl image views')
        .sort({
          views: -1,
        })
        .limit(10);
    } else {
      throw new Error('Parámetro detail inválido');
    }
  },

  async findOptionsFiltering(authors, category, year, language, limit, offset) {
    let query: any = {};

    if (authors) {
      query.authors = {
        $regex: authors,
        $options: 'i',
      };
    }

    if (category) {
      query.category = category;
    }

    if (year) {
      query.year = parseInt(year);
    }

    if (language) {
      query.language = {
        $regex: language,
        $options: 'i',
      };
    }

    if (Object.keys(query).length > 0) {
      const pipeline = qyBooksFiltering(query, offset ?? 0, limit ?? Number.MAX_SAFE_INTEGER);
      const result = await booksModel.aggregate(pipeline).exec();

      const { results, totalBooks, languageCounts, yearCounts, pagesCounts, authorsCounts } =
        result[0];

      return {
        results,
        totalBooks,
        languageCounts,
        yearCounts,
        pagesCounts,
        authorsCounts,
      };
    }

    return {
      results: [],
      totalBooks: 0,
      languageCounts: [],
      yearCounts: [],
      pagesCounts: [],
      authorsCounts: [],
    };
  },

  async findBooksStatsByUser(userId) {
    const [agg] = await booksModel
      .aggregate([
        { $match: { userId } },
        {
          $facet: {
            totalViews: [{ $group: { _id: null, total: { $sum: '$views' } } }],
            mostViewed: [
              { $sort: { views: -1 } },
              { $limit: 1 },
              { $project: { id: '$_id', title: 1, pathUrl: 1, views: 1, _id: 0 } },
            ],
            ids: [{ $project: { id: { $toString: '$_id' }, _id: 0 } }],
          },
        },
      ])
      .exec();

    const totalViews = agg?.totalViews?.[0]?.total ?? 0;
    const mostViewed = agg?.mostViewed?.[0] ?? null;
    const bookIds = (agg?.ids ?? []).map((d: any) => d.id);

    return { totalViews, mostViewed, bookIds };
  },

  async findTopCategoriesByUser(userId, limit) {
    const result = await booksModel
      .aggregate([
        { $match: { userId } },
        { $unwind: '$category' },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .exec();

    return result.map((r) => ({ name: r._id, count: r.count }));
  },

  async createBook(body) {
    const newBook = new booksModel(body);

    return await newBook.save();
  },

  async updateBook(id, body, image) {
    const query = qyPutBook(id, body, image);

    return await booksModel.findByIdAndUpdate(...query);
  },

  async removeBook(id) {
    const book = await booksModel.findById(id);
    const deleteOne = await book?.deleteOne();

    return {
      book,
      deleteOne,
    };
  },
};
