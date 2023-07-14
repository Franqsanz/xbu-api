import { Request, Response } from 'express';
import Redis from 'ioredis';
import { v2 as cloudinary } from 'cloudinary';
import { config } from 'dotenv';
import { connection } from 'mongoose';

import model from "../model/books";
config();

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT as string),
  password: process.env.REDIS_PASS,
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// async function cacheData(req, res, next) {
//   const { body } = req;
//   const key = `books_${body}`;
//   let results;

//   try {
//     const cacheResults = await redis.get(key);
//     if (cacheResults) {
//       results = JSON.parse(cacheResults);
//       res.send({
//         fromCache: true,
//         data: results,
//       });
//     } else {
//       next();
//     }
//   } catch (error) {
//     console.error(error);
//     res.status(404);
//   }
// }

async function getBooks(req: Request, res: Response) {
  const { body } = req;
  const key = `books_${body}`;
  const limit = parseInt(req.query.limit as string);
  const page = parseInt(req.query.page as string) || 1;

  const offset = (page - 1) * limit;

  // Aquí obtenemos los libros de la base de datos usando el método skip y limit
  const results = await model.find({}, 'title category author pathUrl image').skip(offset).limit(limit).sort({ _id: -1 }).exec();

  // Aquí obtenemos el número total de libros en la base de datos
  const totalBooks = await model.countDocuments();

  // Aquí calculamos el número total de páginas
  const totalPages = Math.ceil(totalBooks / limit);
  const nextPage = page < totalPages ? page + 1 : null;
  const nextPageLink = nextPage ? `${req.protocol}://${req.get('host')}${req.path}api?page=${nextPage}${limit ? `&limit=${limit}` : ''}` : null;

  // Aquí construimos el objeto de paginación para incluir en la respuesta
  const info = {
    totalBooks,
    totalPages,
    currentPage: page,
    nextPage: nextPage,
    prevPage: page > 1 ? page - 1 : null,
    nextPageLink: nextPageLink,
    prevPageLink: page > 1 ? `${req.protocol}://${req.get('host')}${req.path}api?page=${page - 1}${limit ? `&limit=${limit}` : ''}` : null,
  };

  // Aquí construimos el objeto de respuesta que incluye los resultados de la consulta y la información de paginación
  const response = {
    info,
    results,
  };

  // Se elimina la cache cuando se busca por paginación
  if (limit && page) await redis.del(key);

  // Se leen los datos almacenados en cache
  const cachedData = await redis.get(key);

  // Si hay datos en la cache se envian al cliente
  if (cachedData) {
    const cachedResponse = JSON.parse(cachedData);
    return res.status(200).json(cachedResponse);
  }

  // Si no hay datos en la cache, se envian a redis los datos de la base
  await redis.set(key, JSON.stringify(response));

  // Expiramos la cache cada 5 minutos
  await redis.expire(key, 300);

  if (results.length < 1) {
    return res.status(404).json({ error: { message: 'No se encontraron más libros' } });
  }

  return res.status(200).json(response);
}

async function getSearchBooks(req: Request, res: Response) {
  const results = await model.find({}, 'title author pathUrl').hint('_id_').sort({ _id: -1 }).exec();

  return res.status(200).json(results);
}

function getAllOptions(req: Request, res: Response) {
  model.aggregate([
    {
      $facet: {
        byCategory: [
          { $unwind: "$category" },
          {
            $group: {
              _id: "$category",
              count: { $sum: 1 }
            }
          }, { $sort: { _id: 1 } }
        ],
        byLanguage: [
          {
            $group: {
              _id: "$language",
              count: { $sum: 1 }
            }
          }, { $sort: { _id: 1 } }
        ],
        byYear: [
          {
            $group: {
              _id: "$year",
              count: { $sum: 1 }
            }
          }, { $sort: { _id: 1 } }
        ]
      }
    },
    {
      $group: {
        _id: null,
        categories: { $push: "$byCategory" },
        languages: { $push: "$byLanguage" },
        years: { $push: "$byYear" }
      }
    },
    {
      $project: {
        _id: 0,
      }
    }
  ]).exec()
    .then((result) => {
      return res.status(200).json(result);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: 'Error al obtener los datos' });
    });
}

function getBooksRandom(req: Request, res: Response) {
  model.find({}, 'title author pathUrl').sort({ _id: -1 }).then((result) => {
    const random = result.sort(() => { return Math.random() - 0.5; });
    const resRandom = random.splice(0, 3);

    return res.status(200).json(resRandom);
    // connection.close();
  }).catch((err) => console.log(err));
}

async function postBooks(req: Request, res: Response) {
  const { body } = req;

  let { url } = body.image;
  const result = await cloudinary.uploader.upload(url, {
    upload_preset: 'xbu-uploads',
    format: 'webp'
  });

  body.image.url = result.secure_url;
  body.image.public_id = result.public_id;

  const newBook = new model(body);

  newBook.save().then((result) => {
    if (!result) {
      return res.status(500).json({ error: { message: 'Error al Publicar' } });
    } else {
      redis.expire(`books_${req.body}`, 0);
      return res.status(200).json(result);
      // connection.close();
    }
  }).catch((err) => console.log(err));
}

function getOnetBooks(req: Request, res: Response) {
  const { id } = req.params;

  model.findById(id).hint('_id_').then((result) => {
    if (!result) {
      return res.status(404).json({ error: { message: 'No se encuentra o no existe' } });
    } else {
      return res.status(200).json(result);
    }
  }).catch((err) => console.log(err));
}

function getPathUrlBooks(req: Request, res: Response) {
  const { pathUrl } = req.params;

  model.findOne({ pathUrl: pathUrl }).then((result) => {
    if (!result) {
      return res.status(404).json({ error: { message: 'No se encuentra o no existe' } });
    } else {
      return res.status(200).json(result);
    }
  }).catch((err) => console.log(err));
}

async function putBooks(req: Request, res: Response) {
  const { id } = req.params;
  const { body } = req;

  // const editBook = {
  //   title: body.title,
  //   author: body.author,
  //   synopsis: body.synopsis,
  //   category: body.category,
  //   year: body.year,
  //   sourceLink: body.sourceLink,
  //   numberPages: body.numberPages,
  //   format: body.format,
  //   image: body.image,
  // };

  let { url, public_id } = body.image;
  const result = await cloudinary.uploader.upload(url, { public_id: public_id });

  const image = {
    url: result.secure_url,
    public_id: result.public_id
  };

  model.findByIdAndUpdate(id, { ...body, image: image }, { new: true }).then((result) => {
    if (!result) {
      return res.status(500).json({ error: { message: 'No se pudo actualizar' } });
    } else {
      return res.status(200).json(result);
    }
  }).catch((err) => console.log(err));
}

async function deleteBooks(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const book = await model.findById(id);

    if (!book) {
      return res.status(404).json({ error: { message: 'Libro no encontrado' } });
    }

    if (book) {
      const public_id = book.image.public_id;
      await cloudinary.uploader.destroy(public_id);
    }

    await book?.deleteOne();

    res.status(200).json({ success: { message: 'Libro eliminado' } });
  } catch (error) {
    res.status(500).json({ error: { message: 'Error al eliminar libro' } });
  }
}

export {
  getBooks,
  getSearchBooks,
  getAllOptions,
  getBooksRandom,
  getOnetBooks,
  getPathUrlBooks,
  postBooks,
  putBooks,
  deleteBooks,
};
