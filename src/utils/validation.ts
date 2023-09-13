import { z } from 'zod';

export const bookSchema = z.object({
  title: z.string().nonempty(),
  author: z.string().nonempty(),
  synopsis: z.string().nonempty(),
  year: z.string().refine((value) => {
    const parsedValue = parseInt(value);
    return !isNaN(parsedValue) && value.length === 4;
  }, {
    message: 'El campo "year" debe ser un año válido con 4 dígitos.'
  }),
  category: z.array(z.string().refine((item) => item.trim() !== '')).nonempty(),
  numberPages: z.string().refine((value) => {
    const parsedValue = parseInt(value);
    return !isNaN(parsedValue) && parsedValue >= 49;
  }, {
    message: '"numberPages" debe tener un minimo o igual a 49, es el número minimo de paginas para un libro.'
  }),
  sourceLink: z.string().optional(),
  language: z.string().nonempty(),
  format: z.string().nonempty(),
  pathUrl: z.string().nonempty(),
  image: z.object({
    url: z.string().nonempty(),
    public_id: z.string(),
  }),
});
