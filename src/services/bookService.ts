import { cloudinary } from '../config/cloudinary';
import { BookRepository } from '../repositories/bookRepository';
import { BookRatingRepository } from '../repositories/bookRatingRepository';
import { BookProgressRepository } from '../repositories/bookProgressRepository';
import { ReportRepository } from '../repositories/reportRepository';
import { bookSchema, bookOriginalSchema } from '../utils/validation';
import { parseBookFile } from '../utils/parseBookFile';
import { NotFound, BadRequest } from '../utils/errors';
import { IBook, IBookFile, BookFileType } from '../types/types';
import { IRepositoryBook } from '../types/repositories/IBookRepository';

const CLOUDINARY_UPLOAD_OPTIONS = {
  upload_preset: 'xbu-uploads',
  folder: `${process.env.CLOUDINARY_FOLDER}/books`,
  format: 'webp' as const,
  transformation: { quality: 60 },
};

const READ_URL_TTL_SECONDS = 600;

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

function uploadEbookToCloudinary(buffer: Buffer, type: BookFileType): Promise<any> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder: `${process.env.CLOUDINARY_FOLDER}/book-files`,
          resource_type: 'raw',
          type: 'authenticated',
          format: type,
        },
        (err, result) => (err ? reject(err) : resolve(result))
      )
      .end(buffer);
  });
}

type IBookService = IRepositoryBook & {
  findStatsByUser(userId: string): Promise<{
    totalViews: number;
    mostViewed: { id: string; title: string; pathUrl: string; views: number } | null;
    averageRating: number;
    ratingsCount: number;
  }>;
  createOriginalBook(
    body: any,
    imageBuffer: Buffer,
    fileBuffer: Buffer,
    requesterIp?: string
  ): Promise<IBook>;
  getReadUrl(
    bookId: string,
    userId: string
  ): Promise<{ url: string; type: BookFileType; expiresAt: number }>;
};

export const BookService: IBookService = {
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

  async findTopCategoriesByUser(userId, limit) {
    return await BookRepository.findTopCategoriesByUser(userId, limit);
  },

  async findBooksStatsByUser(userId) {
    return await BookRepository.findBooksStatsByUser(userId);
  },

  async findStatsByUser(userId: string) {
    const { totalViews, mostViewed, bookIds } = await BookRepository.findBooksStatsByUser(userId);
    const { averageRating, ratingsCount } =
      await BookRatingRepository.getAverageForBookIds(bookIds);

    return { totalViews, mostViewed, averageRating, ratingsCount };
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

  async updateBook(id, body, buffer?, fileBuffer?) {
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

    if (fileBuffer) {
      const existing = await BookRepository.findByIdRaw(id);
      const parsed = await parseBookFile(fileBuffer);

      if (existing?.file?.public_id) {
        await cloudinary.uploader.destroy(existing.file.public_id, {
          resource_type: 'raw',
          type: 'authenticated',
        });
      }

      const fileResult = await uploadEbookToCloudinary(fileBuffer, parsed.type);

      body.file = {
        url: fileResult.secure_url,
        public_id: fileResult.public_id,
        type: parsed.type,
        size: fileBuffer.length,
        pages: parsed.pages,
      };

      // El archivo cambió: los progresos de TODOS los lectores quedan
      // apuntando a contenido viejo. Los limpiamos.
      await BookProgressRepository.deleteAllByBookIds([id]);
    }

    return await BookRepository.updateBook(id, body, image);
  },

  async removeBook(id) {
    const { book, deleteOne } = await BookRepository.removeBook(id);

    if (book) {
      await cloudinary.uploader.destroy(book.image.public_id);
      if (book.file?.public_id) {
        await cloudinary.uploader.destroy(book.file.public_id, {
          resource_type: 'raw',
          type: 'authenticated',
        });
      }
    }

    // Borrar ratings, progreso y reportes huérfanos del libro borrado
    await Promise.all([
      BookRatingRepository.deleteAllByBookIds([id]),
      BookProgressRepository.deleteAllByBookIds([id]),
      ReportRepository.deleteAllByBookIds([id]),
    ]);

    return deleteOne;
  },

  async createOriginalBook(body, imageBuffer, fileBuffer, requesterIp) {
    const validated = bookOriginalSchema.parse(body);
    const parsed = await parseBookFile(fileBuffer);

    const [imageResult, fileResult] = await Promise.all([
      uploadToCloudinary(imageBuffer),
      uploadEbookToCloudinary(fileBuffer, parsed.type),
    ]);

    const file: IBookFile = {
      url: fileResult.secure_url,
      public_id: fileResult.public_id,
      type: parsed.type,
      size: fileBuffer.length,
      pages: parsed.pages,
    };

    // Quitamos el flag del payload persistido — sirve sólo como gate; el
    // registro auditable queda en `authorshipAccepted`.
    const { acceptedAuthorship: _accepted, ...rest } = validated;

    const payload = {
      ...rest,
      image: {
        url: imageResult.secure_url,
        public_id: imageResult.public_id,
      },
      kind: 'original' as const,
      file,
      authorshipAccepted: {
        at: new Date(),
        ip: requesterIp,
      },
    };

    return await BookRepository.createBook(payload);
  },

  async getReadUrl(bookId, userId) {
    const book = await BookRepository.findByIdRaw(bookId);

    if (!book) throw NotFound('Libro no encontrado');
    if (book.kind !== 'original' || !book.file?.public_id) {
      throw BadRequest('Este libro no tiene archivo para lectura.');
    }

    // Acceso gateado por el endpoint (verifyToken). URL firmada con TTL
    // corto. Esta URL apunta al endpoint REST de download de Cloudinary —
    // pdf.js la lee como stream sin problema. Para EPUB el front descarga
    // el blob primero y se lo pasa a epub.js (ver EpubViewer).
    void userId;

    const expiresAt = Math.floor(Date.now() / 1000) + READ_URL_TTL_SECONDS;

    const url = cloudinary.utils.private_download_url(book.file.public_id, book.file.type, {
      resource_type: 'raw',
      type: 'authenticated',
      expires_at: expiresAt,
      attachment: false,
    });

    return { url, type: book.file.type, expiresAt };
  },
};
