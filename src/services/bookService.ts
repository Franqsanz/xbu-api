import { cloudinary } from '../config/cloudinary';
import { BookRepository } from '../repositories/bookRepository';
import { BookRatingRepository } from '../repositories/bookRatingRepository';
import { bookSchema } from '../utils/validation';
import { IRepositoryBook } from '../types/repositories/IBookRepository';

const CLOUDINARY_UPLOAD_OPTIONS = {
  upload_preset: 'xbu-uploads',
  folder: `${process.env.CLOUDINARY_FOLDER}/books`,
  format: 'webp' as const,
  transformation: { quality: 60 },
};

function uploadToCloudinary(buffer: Buffer, public_id?: string): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        { ...CLOUDINARY_UPLOAD_OPTIONS, ...(public_id ? { public_id } : {}) },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  });
}

export const BookService: IRepositoryBook = {
  async findBooks(limit, offset) {
    return await BookRepository.findBooks(limit, offset);
  },

  async findById(id) {
    return await BookRepository.findById(id);
  },

  async findByIdRaw(id) {
    return await BookRepository.findByIdRaw(id);
  },

  async findBySlug(pathUrl) {
    return await BookRepository.findBySlug(pathUrl);
  },

  async findBySlugUpdateViewFavorite(pathUrl, userId) {
    return await BookRepository.findBySlugUpdateViewFavorite(pathUrl, userId);
  },

  async findBySlugFavorite(pathUrl, userId) {
    return await BookRepository.findBySlugFavorite(pathUrl, userId);
  },

  async findSearch(q) {
    return await BookRepository.findSearch(q);
  },

  async findByGroupFields() {
    return await BookRepository.findByGroupFields();
  },

  async findBooksRandom(id) {
    return await BookRepository.findBooksRandom(id);
  },

  async findRelatedBooks(id) {
    return await BookRepository.findRelatedBooks(id);
  },

  async findMoreBooksAuthors(id) {
    return await BookRepository.findMoreBooksAuthors(id);
  },

  async findMostViewedBooks(detail) {
    return await BookRepository.findMostViewedBooks(detail);
  },

  async findOptionsFiltering(authors, category, year, language, limit, offset) {
    return await BookRepository.findOptionsFiltering(
      authors,
      category,
      year,
      language,
      limit,
      offset
    );
  },

  async createBook(body, buffer) {
    const validateBook = bookSchema.parse(body);
    const cloudinaryResult = await uploadToCloudinary(buffer);

    validateBook.image = {
      url: cloudinaryResult.secure_url,
      public_id: cloudinaryResult.public_id,
    };

    return await BookRepository.createBook(validateBook);
  },

  async updateBook(id, body, buffer?) {
    const { url, public_id } = body.image;
    let image: { url: string; public_id?: string };

    if (buffer) {
      // Reemplazo de imagen: borrar la vieja y subir la nueva conservando public_id
      if (public_id) await cloudinary.uploader.destroy(public_id);
      const cleanPublicId = public_id?.split('/').pop();
      const cloudinaryResult = await uploadToCloudinary(buffer, cleanPublicId);

      image = {
        url: cloudinaryResult.secure_url,
        public_id: cloudinaryResult.public_id,
      };
    } else {
      // Sin imagen nueva, mantener la actual
      image = { url, public_id };
    }

    return await BookRepository.updateBook(id, body, image);
  },

  async removeBook(id) {
    const { book, deleteOne } = await BookRepository.removeBook(id);

    if (book) {
      await cloudinary.uploader.destroy(book.image.public_id);
    }

    // Borrar ratings huérfanos del libro borrado
    await BookRatingRepository.deleteAllByBookIds([id]);

    return deleteOne;
  },
};
