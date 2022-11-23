import { Request, Response } from 'express';
import { connection } from 'mongoose';

import model from "../model/books";

function getBooks(req: Request, res: Response) {
  model.find().sort({ _id: -1 }).then((result) => {
    return res.status(200).json(result);
    // connection.close();
  }).catch((err) => console.log(err));
}

function postBooks(req: Request, res: Response) {
  const { body } = req;
  const newBook = new model(body);

  newBook.save().then((result) => {
    if (!result) {
      return res.status(500).send('Error al Publicar');
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
      return res.status(404).json({ error: 'Not found or not exist' });
    } else {
      return res.status(200).json(result);
    }
  }).catch((err) => console.log(err));
}

function putBooks(req: Request, res: Response) {
  const { id } = req.params;
  const { body } = req;

  const editBook = {
    title: body.title,
    description: body.description,
    author: body.author,
    category: body.category,
    year: body.year,
    sourceLink: body.sourceLink,
    numberPages: body.numberPages,
  };

  model.findByIdAndUpdate(id, editBook, { new: true }).then((result) => {
    if (!result) {
      return res.status(500).send('No se pudo actualizar');
    } else {
      return res.status(200).json(result);
    }
  }).catch((err) => console.log(err));
}

function deleteBooks(req: Request, res: Response) {
  const { id } = req.params;

  model.findByIdAndDelete(id).then((result) => {
    if (!result) {
      return res.status(404);
    } else {
      res.status(200).json('ELIMINADO');
    }
  }).catch((err) => console.log(err));
}

export {
  getBooks,
  getOnetBooks,
  postBooks,
  putBooks,
  deleteBooks,
};
