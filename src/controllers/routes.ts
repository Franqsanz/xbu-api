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
  try {
    const { body } = req;
    const key = `books_${body}`;
    const limit = parseInt(req.query.limit as string);
    const page = parseInt(req.query.page as string) || 1;

    const offset = (page - 1) * limit;

    // Aquí obtenemos los libros de la base de datos usando el método skip y limit
    const results = await model.find({}, 'title category language author pathUrl image').skip(offset).limit(limit).sort({ _id: -1 }).exec();

    // Aquí obtenemos el número total de libros en la base de datos
    const totalBooks = await model.countDocuments();

    // Aquí calculamos el número total de páginas
    const totalPages = Math.ceil(totalBooks / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const nextPageLink = nextPage ? `${req.protocol}://${req.get('host')}/api${req.path}?page=${nextPage}${limit ? `&limit=${limit}` : ''}` : null;

    // Aquí construimos el objeto de paginación para incluir en la respuesta
    const info = {
      totalBooks,
      totalPages,
      currentPage: page,
      nextPage: nextPage,
      prevPage: page > 1 ? page - 1 : null,
      nextPageLink: nextPageLink,
      prevPageLink: page > 1 ? `${req.protocol}://${req.get('host')}/api${req.path}?page=${page - 1}${limit ? `&limit=${limit}` : ''}` : null,
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
      return res.status(404).json({ info: { message: 'No se encontraron más libros' } });
    }

    return res.status(200).json(response);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getSearchBooks(req: Request, res: Response) {
  try {
    const { q } = req.query;

    const results = await model.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { author: { $regex: q, $options: 'i' } }
      ]
    }, 'title author pathUrl').hint('_id_').sort({ _id: -1 }).exec();

    if (results.length < 1) {
      return res.status(404).json({ info: { message: `No se encontraron resultados para: ${q}` } });
    }

    return res.status(200).json(results);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getAllOptions(req: Request, res: Response) {
  try {
    const result = await model.aggregate([
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
    ]).exec();

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getBooksRandom(req: Request, res: Response) {
  try {
    const result = await model.find({}, 'title author pathUrl').sort({ _id: -1 });
    const random = result.sort(() => { return Math.random() - 0.5; });
    const resRandom = random.splice(0, 3);

    return res.status(200).json(resRandom);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function postBooks(req: Request, res: Response) {
  try {
    const { body } = req;

    let { url } = body.image;
    const result = await cloudinary.uploader.upload(url, {
      upload_preset: 'xbu-uploads',
      format: 'webp',
    });

    body.image.url = result.secure_url;
    body.image.public_id = result.public_id;

    const newBook = new model(body);
    const resultBook = await newBook.save();

    if (!resultBook) {
      return res.status(500).json({ error: { message: 'Error al Publicar' } });
    }

    redis.expire(`books_${req.body}`, 0);
    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getOneBooks(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await model.findById(id).hint('_id_');

    if (!result) {
      return res.status(404).json({ info: { message: 'No se encuentra o no existe' } });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getPathUrlBooks(req: Request, res: Response) {
  try {
    const { pathUrl } = req.params;

    const result = await model.findOne({ pathUrl: pathUrl });

    if (!result) {
      return res.status(404).json({ info: { message: 'No se encuentra o no existe' } });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function putBooks(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { body } = req;

    let { url, public_id } = body.image;
    const resultCloudinary = await cloudinary.uploader.upload(url, { public_id: public_id });

    const image = {
      url: resultCloudinary.secure_url,
      public_id: resultCloudinary.public_id
    };

    const result = await model.findByIdAndUpdate(id, { ...body, image: image }, { new: true });

    if (!result) {
      return res.status(500).json({ error: { message: 'No se pudo actualizar' } });
    }

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function deleteBooks(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const book = await model.findById(id);

    if (!book) {
      return res.status(404).json({ info: { message: 'Libro no encontrado' } });
    }

    if (book) {
      const public_id = book.image.public_id;
      await cloudinary.uploader.destroy(public_id);
    }

    await book?.deleteOne();

    res.status(200).json({ success: { message: 'Libro eliminado' } });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

export {
  getBooks,
  getSearchBooks,
  getAllOptions,
  getBooksRandom,
  getOneBooks,
  getPathUrlBooks,
  postBooks,
  putBooks,
  deleteBooks,
};
