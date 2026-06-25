import multer from 'multer';

import { BadRequest } from '../../utils/errors';

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

const EBOOK_MIME_TYPES = new Set(['application/pdf', 'application/epub+zip']);

// `image` y `bookFile` viajan juntos en el mismo multipart, así que un único
// middleware con storage en memoria y validación de MIME por campo.
export const uploadOriginal = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'image') {
      if (!file.mimetype.startsWith('image/')) {
        return cb(BadRequest('La portada debe ser una imagen.') as any);
      }
      return cb(null, true);
    }

    if (file.fieldname === 'bookFile') {
      if (!EBOOK_MIME_TYPES.has(file.mimetype)) {
        return cb(BadRequest('El archivo debe ser PDF o EPUB.') as any);
      }
      return cb(null, true);
    }

    return cb(BadRequest('Campo de archivo no permitido.') as any);
  },
}).fields([
  { name: 'image', maxCount: 1 },
  { name: 'bookFile', maxCount: 1 },
]);
