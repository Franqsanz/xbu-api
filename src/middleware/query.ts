import { Request, Response, NextFunction } from 'express';
import model from "../model/books";

export async function query(req: Request, res: Response, next: NextFunction) {
  const query = req.query.category as any;

  if (query) {
    const category = await model.find({ category: { $regex: query, $options: 'i' } });

    if (category.length < 1) return res.status(404).json({ error: 'Is category does not exist' });
    return res.status(200).send(category);
  }

  next();
}
