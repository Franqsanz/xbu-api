import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';
import { v2 as cloudinary } from 'cloudinary';
import pako from 'pako';
import { config } from 'dotenv';

import booksModel from "../model/books";
import usersModel from "../model/users";
import { bookSchema } from '../utils/validation';

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
    const results = await booksModel.find({}, 'title category language authors pathUrl image').skip(offset).limit(limit).sort({ _id: -1 }).exec();

    // Aquí obtenemos el número total de libros en la base de datos
    const totalBooks = await booksModel.countDocuments();

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

    const results = await booksModel.find({
      $or: [
        { title: { $regex: q, $options: 'i' } },
        { authors: { $regex: q, $options: 'i' } }
      ]
    }, 'title authors pathUrl').hint('_id_').sort({ _id: -1 }).exec();

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
    const result = await booksModel.aggregate([
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
    const result = await booksModel.aggregate([
      { $sample: { size: 3 } },
      {
        $project: {
          title: 1,
          pathUrl: 1,
          authors: {
            $cond: {
              if: { $isArray: "$authors" },
              then: "$authors",
              else: ["$authors"]
            }
          }
        }
      }
    ]);

    return res.status(200).json(result);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getRelatedBooks(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const currentBook = await booksModel.findById(id);

    if (!currentBook) {
      return res.status(404).json({ info: { message: 'Libro no encontrado' } });
    }

    const { category } = currentBook;
    const selectedCategory = category[0];

    const relatedBooks = await booksModel.aggregate([
      {
        $match: {
          _id: { $ne: id },
          category: selectedCategory,
        },
      },
      {
        $sample: { size: 3 }
      },
      {
        $project: {
          title: 1,
          pathUrl: 1,
          authors: {
            $cond: {
              if: { $isArray: "$authors" },
              then: "$authors",
              else: ["$authors"]
            }
          }
        }
      }
    ]);

    return res.status(200).json(relatedBooks);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getMoreBooksAuthors(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const currentBook = await booksModel.findById(id);

    if (!currentBook) {
      return res.status(404).json({ info: { message: 'Libro no encontrado' } });
    }

    const { authors } = currentBook;
    const selectedAuthors = authors[0];

    const moreBooksAuthors = await booksModel.aggregate([
      {
        $match: {
          _id: { $ne: id },
          authors: { $regex: selectedAuthors, $options: 'i' },
        },
      },
      {
        $sample: { size: 3 }
      },
      {
        $project: {
          title: 1,
          pathUrl: 1,
          authors: {
            $cond: {
              if: { $isArray: "$authors" },
              then: "$authors",
              else: ["$authors"]
            }
          }
        }
      }
    ]);

    return res.status(200).json(moreBooksAuthors);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function postBooks(req: Request, res: Response) {
  try {
    const { body } = req;
    const validateBook = bookSchema.parse(body);

    let { url } = body.image;
    const uint8Array = new Uint8Array(url);
    const decompressedImage = pako.inflate(uint8Array);
    const buffer = Buffer.from(decompressedImage);

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
    validateBook.image.public_id = cloudinaryResult.public_id;

    const newBook = new booksModel(validateBook);
    const resultBook = await newBook.save();

    if (!resultBook) {
      return res.status(500).json({ error: { message: 'Error al Publicar' } });
    }

    redis.expire(`books_${req.body}`, 0);
    return res.status(200).json(resultBook);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}

async function getOneBooks(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const result = await booksModel.findById(id).hint('_id_');

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

    const result = await booksModel.findOne({ pathUrl: pathUrl });

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
    let image;

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


    const result = await booksModel.findByIdAndUpdate(id, { ...body, image: image }, { new: true });

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

    const book = await booksModel.findById(id);

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

// Usuarios
async function getUsers(req: Request, res: Response) {
  try {
    const users = await usersModel.find();

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error al obtener los usuario', error);
  }
}

async function getCheckUser(req: Request, res: Response) {
  try {
    const { userId } = req.params;
    const user = await usersModel.findOne({ uid: userId }, 'uid name username picture');

    if (!user) {
      return res.status(404).json({ error: { message: 'Usuario no encontrado' } });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error al buscar el usuario', error);
  }
}

async function getUserAndBooks(req: Request, res: Response) {
  try {
    const { username } = req.params;
    const limit = parseInt(req.query.limit as string);
    const page = parseInt(req.query.page as string) || 1;
    const offset = (page - 1) * limit;

    const user = await usersModel.findOne({ username: username }, 'uid name picture createdAt');

    if (!user) {
      return res.status(404).json({ error: { message: 'Usuario no encontrado' } });
    }

    const results = await booksModel.find({ userId: user.uid }, 'title category language authors pathUrl image').skip(offset).limit(limit).sort({ _id: -1 }).exec();
    const totalBooks = await booksModel.countDocuments({ userId: user.uid });

    const totalPages = Math.ceil(totalBooks / limit);
    const nextPage = page < totalPages ? page + 1 : null;
    const nextPageLink = nextPage ? `${req.protocol}://${req.get('host')}/api/users${req.path}?page=${nextPage}${limit ? `&limit=${limit}` : ''}` : null;

    const info = {
      totalBooks,
      totalPages,
      currentPage: page,
      nextPage: nextPage,
      prevPage: page > 1 ? page - 1 : null,
      nextPageLink: nextPageLink,
      prevPageLink: page > 1 ? `${req.protocol}://${req.get('host')}/api/users${req.path}?page=${page - 1}${limit ? `&limit=${limit}` : ''}` : null,
    };

    const response = {
      info,
      user,
      results,
    };

    // if (results.length < 1) {
    //   return res.status(404).json({ info: { message: 'No se encontraron más libros' } });
    // }

    return res.status(200).json(response);
  } catch (error) {
    console.error('Error al obtener el usuario y los libros:', error);
  }
}

async function deleteAccount(req: Request, res: Response) {
  try {
    const { userId } = req.params;

    const user = await usersModel.findOne({ uid: userId });
    const books = await booksModel.find({ userId: userId });

    if (!user) {
      return res.status(404).json({ info: { message: 'Usuario no encontrado' } });
    }

    for (let book of books) {
      const public_id = book.image.public_id;
      await cloudinary.uploader.destroy(public_id);
      await book.deleteOne();
    }

    await user?.deleteOne();

    res.status(200).json({ success: { message: 'Cuenta eliminada' } });
  } catch (error) {
    res.status(500).json({ error: { message: 'Error en el servidor' } });
  }
}


export {
  getBooks,
  getSearchBooks,
  getAllOptions,
  getBooksRandom,
  getRelatedBooks,
  getMoreBooksAuthors,
  getOneBooks,
  getPathUrlBooks,
  postBooks,
  putBooks,
  deleteBooks,
  // Usuarios
  getUsers,
  getCheckUser,
  getUserAndBooks,
  deleteAccount,
};
