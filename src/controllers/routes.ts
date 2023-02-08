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

async function getBooks(req: Request, res: Response) {
  const { body } = req;
  const key = `books_${body}`;
  const lit = parseInt(req.query.limit as string);

  const cachedData = await redis.get(key);

  if (cachedData) {
    return res.status(200).json(JSON.parse(cachedData));
  } else {
    model.find().limit(lit).sort({ _id: -1 }).then((result) => {
      redis.set(key, JSON.stringify(result));
      redis.expire(key, 300);
      return res.status(200).json(result);
      // connection.close();
    }).catch((err) => console.log(err));
  }
}

function getBooksRandom(req: Request, res: Response) {
  model.find().sort({ _id: -1 }).then((result) => {
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
  });

  body.image.url = result.url;
  body.image.public_id = result.public_id;

  const newBook = new model(body);

  newBook.save().then((result) => {
    if (!result) {
      return res.status(500).json({ error: { message: 'Error al Publicar' } });
    } else {
      return res.status(200).json(result);
      // connection.close();
    }
  }).catch((err) => console.log(err));
}

function getOnetBooks(req: Request, res: Response) {
  const { id } = req.params;

  model.findById(id).then((result) => {
    if (!result) {
      return res.status(404).json({ error: { message: 'Not found or not exist' } });
    } else {
      return res.status(200).json(result);
    }
  }).catch((err) => console.log(err));
}

async function putBooks(req: Request, res: Response) {
  const { id } = req.params;
  const { body } = req;

  const editBook = {
    title: body.title,
    author: body.author,
    synopsis: body.synopsis,
    category: body.category,
    year: body.year,
    sourceLink: body.sourceLink,
    numberPages: body.numberPages,
    format: body.format,
    image: body.image,
  };

  let { url, public_id } = body.image;
  const result = await cloudinary.uploader.upload(url, { public_id: public_id });

  const imageUrl = result.url;
  // console.log(result.url);

  model.findByIdAndUpdate(id, { ...body, image: imageUrl }, { new: true }).then((result) => {
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

    await book?.delete();

    res.status(200).json({ success: { message: 'Libro eliminado' } });
  } catch (error) {
    res.status(500).json({ error: { message: 'Error al eliminar libro' } });
  }
}

export {
  getBooks,
  getBooksRandom,
  getOnetBooks,
  postBooks,
  putBooks,
  deleteBooks,
};
