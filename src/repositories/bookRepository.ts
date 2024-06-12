import booksModel from "../models/books";
import {
  qyGroupOptions,
  qyOneBooks,
  qyPathUrlBooks,
  qySearch,
  qyBooksRandom,
  qyRelatedBooks,
  qyMoreBooksAuthors,
  qyPutBook
} from '../db/bookQueries';

export const BookRepository = {
  async findBooks(limit: number, offset: number) {
    // Aquí obtenemos los libros de la base de datos usando el método skip y limit
    const results = await booksModel.find({}, 'title category language authors pathUrl image')
      .skip(offset)
      .limit(limit)
      .sort({ _id: -1 })
      .exec();

    // Aquí obtenemos el número total de libros en la base de datos
    const totalBooks = await booksModel.countDocuments();

    return { results, totalBooks };
  },

  async findOne(id: string) {
    const query = qyOneBooks(id);

    return await booksModel.findByIdAndUpdate(...query).hint('_id_');
  },

  async findBySlug(slug: string) {
    const query = qyPathUrlBooks(slug);

    return await booksModel.findOneAndUpdate(...query);
  },

  async findSearch(q: object | string | undefined) {
    const { query, projection } = qySearch(q);

    return await booksModel.find(query, projection).hint('_id_').sort({ _id: -1 }).exec();
  },

  async findByGroupFields() {
    const query = qyGroupOptions();

    return await booksModel.aggregate(query).exec();
  },

  async findBooksRandom() {
    const query = qyBooksRandom();

    return await booksModel.aggregate(query);
  },

  async findRelatedBooks(id: string) {
    const currentBook = await booksModel.findById(id);

    if (currentBook) {
      const { category } = currentBook;
      const selectedCategory = category[0];
      const query = qyRelatedBooks(id, selectedCategory);

      return await booksModel.aggregate(query);
    }
  },

  async findMoreBooksAuthors(id: string) {
    const currentBook = await booksModel.findById(id);

    if (currentBook) {
      const { authors } = currentBook;
      const selectedCategory = authors[0];
      const query = qyMoreBooksAuthors(id, selectedCategory);

      return await booksModel.aggregate(query);
    }
  },

  async findMostViewedBooks(detail: string | undefined) {
    if (detail === 'summary') {
      return await booksModel.find({}, ' title pathUrl views').sort({ views: -1 }).limit(10);
    } else if (detail === 'full') {
      return await booksModel.find({}, 'title category language authors pathUrl image').sort({ views: -1 }).limit(10);
    } else {
      throw new Error('Parámetro detail inválido');
    }
  },

  async findOptionsFiltering(category: string, year: string, language: string) {
    const projection = 'image title authors category language year pathUrl';
    let query: any = {};

    if (category) {
      query.category = category;
    }

    if (year) {
      query.year = year;
    }

    if (language) {
      query.language = { $regex: language, $options: 'i' };
    }

    if (Object.keys(query).length > 0) {
      return await booksModel.find(query, projection).sort({ _id: -1 });
    }
  },

  async createBook(body: any) {
    const newBook = new booksModel(body);

    return await newBook.save();
  },

  async updateBook(id: string, body: any, image: any) {
    const query = qyPutBook(id, body, image);

    return await booksModel.findByIdAndUpdate(...query);
  },

  async deleteBook(id: string) {
    const book = await booksModel.findById(id);
    const deleteOne = await book?.deleteOne();

    return { book, deleteOne };
  },
};
