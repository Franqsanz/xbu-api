import { v2 as cloudinary } from 'cloudinary';
import pako from 'pako';

import booksModel from "../model/books";
import { bookSchema } from '../utils/validation';
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

export const BookService = {
  async findAllBooks(limit: number, offset: number) {
    try {
      // Aquí obtenemos los libros de la base de datos usando el método skip y limit
      const results = await booksModel.find({}, 'title category language authors pathUrl image')
        .skip(offset)
        .limit(limit)
        .sort({ _id: -1 })
        .exec();

      // Aquí obtenemos el número total de libros en la base de datos
      const totalBooks = await booksModel.countDocuments();

      return { results, totalBooks };
    } catch (error) {
      throw error;
    }
  },

  async findOne(id: string) {
    const query = qyOneBooks(id);

    try {
      return await booksModel.findByIdAndUpdate(...query).hint('_id_');
    } catch (error) {
      throw error;
    }
  },

  async findBySlug(pathUrl: string) {
    const query = qyPathUrlBooks(pathUrl);

    try {
      return await booksModel.findOneAndUpdate(...query);
    } catch (error) {
      throw error;
    }
  },

  async findSearch(q: object | string | undefined) {
    const { query, projection } = qySearch(q);

    try {
      return await booksModel.find(query, projection).hint('_id_').sort({ _id: -1 }).exec();
    } catch (error) {
      throw error;
    }
  },

  async findByGroupFields() {
    const query = qyGroupOptions();

    try {
      return await booksModel.aggregate(query).exec();
    } catch (error) {
      throw error;
    }
  },

  async findBooksRandom() {
    const query = qyBooksRandom();

    try {
      return await booksModel.aggregate(query);
    } catch (error) {
      throw error;
    }
  },

  async findRelatedBooks(id: string) {
    try {
      const currentBook = await booksModel.findById(id);

      if (currentBook) {
        const { category } = currentBook;
        const selectedCategory = category[0];
        const query = qyRelatedBooks(id, selectedCategory);

        return await booksModel.aggregate(query);
      }
    } catch (error) {
      throw error;
    }
  },

  async findMoreBooksAuthors(id: string) {
    try {
      const currentBook = await booksModel.findById(id);

      if (currentBook) {
        const { authors } = currentBook;
        const selectedCategory = authors[0];
        const query = qyMoreBooksAuthors(id, selectedCategory);

        return await booksModel.aggregate(query);
      }
    } catch (error) {
      throw error;
    }
  },

  async findMostViewedBooks(detail: string | undefined) {
    try {
      if (detail === 'summary') {
        return await booksModel.find({}, ' title pathUrl views').sort({ views: -1 }).limit(10);
      } else if (detail === 'full') {
        return await booksModel.find({}, 'title category language authors pathUrl image').sort({ views: -1 }).limit(10);
      } else {
        throw new Error('Parámetro detail inválido');
      }
    } catch (error) {
      throw error;
    }
  },

  async findOptionsFiltering(category: string, year: string, language: string) {
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

    const projection = 'image title authors category language year pathUrl';

    try {
      if (Object.keys(query).length > 0) {
        return await booksModel.find(query, projection).sort({ _id: -1 });
      }
    } catch (error) {
      throw error;
    }
  },

  async createBook(body: any) {
    const validateBook = bookSchema.parse(body);

    let { url } = body.image;
    const uint8Array = new Uint8Array(url);
    const decompressedImage = pako.inflate(uint8Array);
    const buffer = Buffer.from(decompressedImage);

    try {
      const cloudinaryResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream({
          upload_preset: 'xbu-uploads',
          format: 'webp',
          transformation: { quality: 60 }
        }, (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }).end(buffer);
      });

      validateBook.image.url = cloudinaryResult.secure_url;
      validateBook.image.public_id = cloudinaryResult.public_id;

      const newBook = new booksModel(validateBook);

      return await newBook.save();

    } catch (error) {
      throw error;
    }
  },

  async updateBook(id: string, body: any) {
    let { url, public_id } = body.image;
    let image;

    try {
      if (typeof body.image.url === 'string') {
        image = {
          url: url,
          public_id: public_id
        };
      } else {
        if (public_id) await cloudinary.uploader.destroy(public_id); // Eliminamos la imagen actual

        const uint8Array = new Uint8Array(url);
        const decompressedImage = pako.inflate(uint8Array);
        const buffer = Buffer.from(decompressedImage);

        // Subimos la nueva imagen conservando el mismo public_id de la imagen que eliminamos
        const cloudinaryResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader.upload_stream({
            upload_preset: 'xbu-uploads',
            format: 'webp',
            transformation: { quality: 60 },
            public_id: public_id
          }, (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }).end(buffer);
        });

        image = {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id
        };
      }

      const query = qyPutBook(id, body, image);

      return await booksModel.findByIdAndUpdate(...query);
    } catch (error) {
      throw error;
    }
  },

  async removeBook(id: string) {
    try {
      const book = await booksModel.findById(id);

      if (book) {
        const public_id = book.image.public_id;
        await cloudinary.uploader.destroy(public_id);
      }

      return await book?.deleteOne();

    } catch (error) {
      throw error;
    }
  },
};
