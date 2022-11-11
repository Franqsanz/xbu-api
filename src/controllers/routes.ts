import { Request, Response } from 'express';
import { connection } from 'mongoose';
import model from "../model/books";

async function getBooks(req: Request, res: Response) {
  const books = await model.find().sort({ _id: -1 });
  if (!books) res.status(404).send('No encontrado');

  return res.status(200).json(books);
}

async function postBooks(req: Request, res: Response) {
  const { body } = req;
  const newBook = new model(body);

  const saveBook = await newBook.save();
  if (!saveBook) return res.status(500).send('Error al Publicar');

  return res.status(200).json(saveBook);
}

async function getOnetBooks(req: Request, res: Response) {
  const { id } = req.params;

  const book = await model.findById(id).catch((err) => console.log(err));
  if (!book) return res.status(404).json({ error: 'Not found or not exist' });

  return res.status(200).json(book);
}

async function putBooks(req: Request, res: Response) {
  const { id } = req.params;
  const { body } = req;

  const editBook = {
    title: body.title,
    description: body.description,
    autor: body.autor,
    category: body.category,
    year: body.year,
    sourceLink: body.sourceLink,
    numberPages: body.numberPages,
  };

  const update = await model.findByIdAndUpdate(id, editBook, { new: true });
  if (!update) return res.status(500).send('No se pudo actualizar');

  return res.status(200).json(update);
  // connection.close();
}

async function deleteBooks(req: Request, res: Response) {
  const { id } = req.params;

  const result = await model.findByIdAndDelete(id);
  if (!result) return res.status(404);

  res.status(204).send('ELIMINADO');
  // connection.close();
}

export {
  getBooks,
  getOnetBooks,
  postBooks,
  putBooks,
  deleteBooks,
};
