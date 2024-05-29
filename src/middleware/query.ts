import { Request, Response, NextFunction } from 'express';
import model from "../model/books";

export async function query(req: Request, res: Response, next: NextFunction) {
  const { category, year, language } = req.query;
  let query = {};

  try {
    if (category) {
      query = { ...query, category: category };
    }

    if (year) {
      query = { ...query, year: year };
    }

    if (language) {
      query = {
        ...query, language: { $regex: language, $options: 'i' }
      };
    }

    const projection = 'image title authors category language year pathUrl';

    if (Object.keys(query).length > 0) {
      const results = await model.find(query, projection).sort({ _id: -1 });

      if (results.length < 1) return res.status(404).json({ info: { message: `La busqueda que introdujiste no ha sido encontrada.` } });

      return res.status(200).json(results);
    }
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: { message: 'Error en el servidor' } });
  }

  next();
};
