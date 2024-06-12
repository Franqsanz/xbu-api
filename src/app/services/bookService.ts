// import { v2 as cloudinary } from 'cloudinary';
import pako from 'pako';

import { cloudinary } from '../../config/cloudinary';
import { BookRepository } from "../../repositories/bookRepository";
import { bookSchema } from '../../utils/validation';

export const BookService = {
  async findAllBooks(limit: number, offset: number) {
    try {
      return await BookRepository.findBooks(limit, offset);
    } catch (error) {
      throw error;
    }
  },

  async findOne(id: string) {
    try {
      return await BookRepository.findOne(id);
    } catch (error) {
      throw error;
    }
  },

  async findBySlug(pathUrl: string) {
    try {
      return await BookRepository.findBySlug(pathUrl);
    } catch (error) {
      throw error;
    }
  },

  async findSearch(q: object | string | undefined) {
    try {
      return await BookRepository.findSearch(q);
    } catch (error) {
      throw error;
    }
  },

  async findByGroupFields() {
    try {
      return await BookRepository.findByGroupFields();
    } catch (error) {
      throw error;
    }
  },

  async findBooksRandom() {
    try {
      return await BookRepository.findBooksRandom();
    } catch (error) {
      throw error;
    }
  },

  async findRelatedBooks(id: string) {
    try {
      return await BookRepository.findRelatedBooks(id);
    } catch (error) {
      throw error;
    }
  },

  async findMoreBooksAuthors(id: string) {
    try {
      return await BookRepository.findMoreBooksAuthors(id);
    } catch (error) {
      throw error;
    }
  },

  async findMostViewedBooks(detail: string | undefined) {
    try {
      return await BookRepository.findMostViewedBooks(detail);
    } catch (error) {
      throw error;
    }
  },

  async findOptionsFiltering(category: string, year: string, language: string) {
    try {
      return await BookRepository.findOptionsFiltering(category, year, language);
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
      validateBook.image.public_id = cloudinaryResult.public_id;;

      return await BookRepository.createBook(validateBook);
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

      return await BookRepository.updateBook(id, body, image);
    } catch (error) {
      throw error;
    }
  },

  async removeBook(id: string) {
    try {
      const { book, deleteOne } = await BookRepository.deleteBook(id);

      if (book) {
        const public_id = book.image.public_id;
        await cloudinary.uploader.destroy(public_id);
      }

      return deleteOne;

    } catch (error) {
      throw error;
    }
  },
};
