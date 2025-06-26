import pako from 'pako';

import { cloudinary } from '../config/cloudinary';
import { BookRepository } from '../repositories/bookRepository';
import { bookSchema } from '../utils/validation';
import { IRepositoryBook } from '../types/IRepository';

const folderUploads =
  process.env.NODE_ENV === 'production'
    ? 'xbu'
    : process.env.NODE_ENV === 'staging'
      ? 'xbu_dev' // Staging usa xbu_dev
      : 'xbu_dev'; // Local también usa xbu_dev

export const BookService: IRepositoryBook = {
  async findBooks(limit, offset) {
    try {
      return await BookRepository.findBooks(limit, offset);
    } catch (err) {
      throw err;
    }
  },

  async findById(id) {
    try {
      return await BookRepository.findById(id);
    } catch (err) {
      throw err;
    }
  },

  async findBySlug(pathUrl) {
    try {
      return await BookRepository.findBySlug(pathUrl);
    } catch (err) {
      throw err;
    }
  },

  async findBySlugUpdateViewFavorite(pathUrl, userId) {
    try {
      return await BookRepository.findBySlugUpdateViewFavorite(pathUrl, userId);
    } catch (err) {
      throw err;
    }
  },

  async findBySlugFavorite(pathUrl, userId) {
    try {
      return await BookRepository.findBySlugFavorite(pathUrl, userId);
    } catch (err) {
      throw err;
    }
  },

  async findSearch(q) {
    try {
      return await BookRepository.findSearch(q);
    } catch (err) {
      throw err;
    }
  },

  async findByGroupFields() {
    try {
      return await BookRepository.findByGroupFields();
    } catch (err) {
      throw err;
    }
  },

  async findBooksRandom(id) {
    try {
      return await BookRepository.findBooksRandom(id);
    } catch (err) {
      throw err;
    }
  },

  async findRelatedBooks(id) {
    try {
      return await BookRepository.findRelatedBooks(id);
    } catch (err) {
      throw err;
    }
  },

  async findMoreBooksAuthors(id) {
    try {
      return await BookRepository.findMoreBooksAuthors(id);
    } catch (err) {
      throw err;
    }
  },

  async findMostViewedBooks(detail) {
    try {
      return await BookRepository.findMostViewedBooks(detail);
    } catch (err) {
      throw err;
    }
  },

  async findOptionsFiltering(authors, category, year, language, limit, offset) {
    try {
      return await BookRepository.findOptionsFiltering(
        authors,
        category,
        year,
        language,
        limit,
        offset
      );
    } catch (err) {
      throw err;
    }
  },

  async createBook(body) {
    const validateBook = bookSchema.parse(body);

    let { url } = body.image;
    const uint8Array = new Uint8Array(url);
    const decompressedImage = pako.inflate(uint8Array);
    const buffer = Buffer.from(decompressedImage);

    try {
      const cloudinaryResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              upload_preset: 'xbu-uploads',
              folder: folderUploads,
              format: 'webp',
              transformation: {
                quality: 60,
              },
            },
            (err, result) => {
              if (err) {
                reject(err);
              } else {
                resolve(result);
              }
            }
          )
          .end(buffer);
      });

      validateBook.image.url = cloudinaryResult.secure_url;
      validateBook.image.public_id = cloudinaryResult.public_id;

      return await BookRepository.createBook(validateBook);
    } catch (err) {
      throw err;
    }
  },

  async updateBook(id, body) {
    let { url, public_id } = body.image;
    let image;

    try {
      if (typeof body.image.url === 'string') {
        image = {
          url: url,
          public_id: public_id,
        };
      } else {
        if (public_id) await cloudinary.uploader.destroy(public_id); // Eliminamos la imagen actual

        const uint8Array = new Uint8Array(url);
        const decompressedImage = pako.inflate(uint8Array);
        const buffer = Buffer.from(decompressedImage);

        // Subimos la nueva imagen conservando el mismo public_id de la imagen que eliminamos
        const cloudinaryResult = await new Promise<any>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                upload_preset: 'xbu-uploads',
                folder: folderUploads,
                format: 'webp',
                transformation: {
                  quality: 60,
                },
                public_id: public_id,
              },
              (err, result) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(result);
                }
              }
            )
            .end(buffer);
        });

        image = {
          url: cloudinaryResult.secure_url,
          public_id: cloudinaryResult.public_id,
        };
      }

      return await BookRepository.updateBook(id, body, image);
    } catch (err) {
      throw err;
    }
  },

  async removeBook(id) {
    try {
      const { book, deleteOne } = await BookRepository.removeBook(id);

      if (book) {
        const public_id = book.image.public_id;
        await cloudinary.uploader.destroy(public_id);
      }

      return deleteOne;
    } catch (err) {
      throw err;
    }
  },
};
