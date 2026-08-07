import { z, ZodSchema } from 'zod';
import { BadRequest } from './errors';

/**
 * Parseo de un payload contra un schema Zod. Tira BadRequest con el primer
 * mensaje de error si no valida — mantiene el shape de errores consistente
 * con el resto del backend.
 */
export function parseOrThrow<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? 'Datos inválidos';
    throw BadRequest(message);
  }
  return result.data;
}

const bookSchema = z.object({
  title: z.string().min(1, 'title es requerido.'),
  authors: z.array(z.string().refine((item) => item.trim() !== '')).nonempty({
    message: 'El array authors es requerido.',
  }),
  synopsis: z.string().min(1, 'synopsis es requerido.'),
  year: z.string().refine(
    (value) => {
      const parsedValue = parseInt(value);
      return !isNaN(parsedValue) && parsedValue >= 1800 && parsedValue <= 2050;
    },
    {
      message: 'El campo "year" debe ser un año válido entre 1800 y 2050.',
    }
  ),
  category: z.array(z.string().refine((item) => item.trim() !== '')).nonempty({
    message: 'El array category es requerido.',
  }),
  numberPages: z.string().refine(
    (value) => {
      const parsedValue = parseInt(value);
      return !isNaN(parsedValue) && parsedValue >= 49;
    },
    {
      message:
        '"numberPages" debe tener un minimo o igual a 49, es el número minimo de paginas para un libro.',
    }
  ),
  sourceLink: z.string().optional().or(z.literal('')),
  language: z.string().min(1, 'language es requerido.'),
  format: z.string().min(1, 'format es requerido.'),
  pathUrl: z.string().optional(),
  image: z.object({
    url: z.string().optional(),
    public_id: z.string().default(''),
  }),
  userId: z.string().optional(),
  rating: z.number().optional(),
});

const bookOriginalSchema = bookSchema.extend({
  acceptedAuthorship: z.literal(true, {
    message: 'Debes confirmar que sos el autor o tenés derechos sobre el libro.',
  }),
});

const commentSchema = z.object({
  text: z
    .string()
    .min(1, 'El comentario es obligatorio')
    .max(1500, 'El comentario no puede exceder los 1500 caracteres')
    .trim(),
  author: z.object({
    userId: z.string().min(1, 'El ID del usuario no puede estar vacío'),
  }),
  bookId: z.string().min(1, 'El ID del libro no puede estar vacío'),
});

const bookRatingSchema = z.object({
  rating: z
    .number({ message: 'rating debe ser un número entre 1 y 5.' })
    .int({ message: 'rating debe ser entero.' })
    .min(1, 'rating mínimo 1.')
    .max(5, 'rating máximo 5.'),
});

const bookStatusValueSchema = z.enum(['read', 'reading', 'want_to_read'], {
  message: 'status debe ser read, reading o want_to_read.',
});

const bookStatusSchema = z.object({
  status: bookStatusValueSchema,
});

const bookProgressSchema = z.object({
  position: z.union([z.number().int().min(0), z.string().min(1)], {
    message: 'position debe ser un número (PDF) o string CFI (EPUB).',
  }),
  type: z.enum(['pdf', 'epub'], {
    message: 'type debe ser pdf o epub.',
  }),
  percentage: z.number().min(0).max(100).optional(),
});

const commentUpdateSchema = z.object({
  text: z
    .string()
    .min(1, 'El comentario es obligatorio')
    .max(1500, 'El comentario no puede exceder los 1500 caracteres')
    .trim(),
});

const commentReactionSchema = z.object({
  type: z.enum(['like', 'dislike'], {
    message: 'type debe ser like o dislike.',
  }),
});

const reportBookSchema = z.object({
  type: z.enum(['copyright', 'inappropriate', 'spam', 'other'], {
    message: 'Tipo de reporte inválido.',
  }),
  description: z.string().max(2000).optional(),
  contactEmail: z.string().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Ingresá un email válido.'),
});

const notificationReadStatusSchema = z.object({
  read: z.boolean({ message: 'Campo "read" requerido (boolean).' }),
});

const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username entre 3 y 20 caracteres.')
    .max(20, 'Username entre 3 y 20 caracteres.'),
});

const idTokenSchema = z.object({
  idToken: z.string({ message: 'Token requerido.' }).min(1, 'Token requerido.'),
});

export {
  bookSchema,
  bookOriginalSchema,
  commentSchema,
  bookRatingSchema,
  bookStatusSchema,
  bookStatusValueSchema,
  bookProgressSchema,
  commentUpdateSchema,
  commentReactionSchema,
  reportBookSchema,
  notificationReadStatusSchema,
  registerSchema,
  idTokenSchema,
};
