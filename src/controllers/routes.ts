import { Request, Response } from 'express';
import { connection } from 'mongoose';
import model from "../model/books";

function getBooks(req: Request, res: Response) {
  model.find((err, users) => {
    res.json(users);
    // connection.close();
  });
}

function postBooks(req: Request, res: Response) {
  const { body } = req;
  const newBook = new model(body);

  newBook.save()
    .then((result: Object) => {
      res.json(result);
      // connection.close();
    })
    .catch((err) => res.send(err));
}

function getOnetBooks(req: Request, res: Response) {
  const { id } = req.params;

  model.findById(id)
    .then(book => {
      if (book) return res.json(book);
      res.status(404).send('Not Found');
    });
  // connection.close();
}

function putBooks(req: Request, res: Response) {
  const { id } = req.params;
  const { body } = req;

  const editBook = {
    title: body.title,
    description: body.description,
    autor: body.autor,
    category: body.category,
    publicationDate: body.publicationDate,
    numberPages: body.numberPages,
  }

  model.findByIdAndUpdate(id, editBook, { new: true })
    .then(result => {
      res.json(result);
    });
  // connection.close();
}

async function deleteBooks(req: Request, res: Response) {
  const { id } = req.params;

  const result = await model.findByIdAndDelete(id);
  if (result === null) return res.status(404);

  res.status(204).send('ELIMINADO');
  // connection.close();
}

export {
  getBooks,
  getOnetBooks,
  postBooks,
  putBooks,
  deleteBooks
}