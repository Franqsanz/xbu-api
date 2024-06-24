import { z } from 'zod';

export const bookSchema = z.object({
  title: z.string().min(0, 'title es requerido.'),
  authors: z.array(z.string().refine((item) => item.trim() !== '')).nonempty({
    message: 'El array authors es requerido.',
  }),
  synopsis: z.string().min(0, 'synopsis es requerido.'),
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
      message: '"numberPages" debe tener un minimo o igual a 49, es el número minimo de paginas para un libro.',
    }
  ),
  sourceLink: z.string().optional(),
  language: z.string().min(0, 'language es requerido.'),
  format: z.string().min(0, 'format es requerido.'),
  pathUrl: z.string().min(0),
  image: z.object({
    url: z.union([z.string(), z.array(z.number())]),
    public_id: z.string(),
  }),
  userId: z.string(),
});

// export type Book = z.infer<typeof bookSchema>;
