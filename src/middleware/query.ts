import { Request, Response, NextFunction } from 'express';
import model from "../model/books";

export async function query(req: Request, res: Response, next: NextFunction) {
  const { category, year, language } = req.query;

  let query = {};

  if (category) {
    query = { ...query, category: { $regex: category, $options: 'i' } };
  }

  if (year) {
    query = { ...query, year: year };
  }

  if (language) {
    query = {
      ...query, language: { $regex: language, $options: 'i' }
    };
  }

  if (Object.keys(query).length > 0) {
    const results = await model.find(query).hint('category_1').sort({ _id: -1 });

    if (results.length < 1) return res.status(404).json({ error: { message: 'La información no ha sido encontrada.' } });
    return res.status(200).json(results);
  }

  next();
}
