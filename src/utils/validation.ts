import { z } from 'zod';

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
  sourceLink: z.string().optional(),
  language: z.string().min(1, 'language es requerido.'),
  format: z.string().min(1, 'format es requerido.'),
  pathUrl: z.string().min(1),
  image: z.object({
    url: z.union([z.string(), z.array(z.number())]),
    public_id: z.string(),
  }),
  userId: z.string(),
  rating: z.number().optional(),
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

export { bookSchema, commentSchema };
