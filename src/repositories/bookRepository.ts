import booksModel from '../models/books';
import { IRepositoryBook } from '../types/IRepository';
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

export const BookRepository: IRepositoryBook = {
  async findBooks(limit, offset) {
    // Aquí obtenemos los libros de la base de datos usando el método skip y limit
    const results = await booksModel
      .find({}, 'title category language authors pathUrl image')
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

  async findBySlug(slug) {
    const query = qyPathUrlBooks(slug);

    return await booksModel.findOneAndUpdate(...query);
  },

  async findSearch(q) {
    const { query, projection } = qySearch(q);

    return await booksModel
      .find(query, projection)
      .hint('_id_')
      .sort({
        _id: -1,
      })
      .exec();
  },

  async findByGroupFields() {
    const query = qyGroupOptions();

    return await booksModel.aggregate(query).exec();
  },

  async findBooksRandom() {
    const query = qyBooksRandom();

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
        .find({}, 'title category language authors pathUrl image')
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
      const pipeline = qyBooksFiltering(query, offset, limit);
      const result = await booksModel.aggregate(pipeline).exec();

      const { results, totalBooks, languageCounts, yearCounts } = result[0];

      return {
        results,
        totalBooks,
        languageCounts,
        yearCounts,
      };
    }

    return {
      results: [],
      totalBooks: 0,
      languageCounts: 0,
      yearCounts: 0,
    };
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
