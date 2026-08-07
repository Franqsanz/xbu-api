import { Request, Response, NextFunction } from 'express';

import { ReportService } from '../../services/reportService';
import { BadRequest } from '../../utils/errors';
import { reportBookSchema, parseOrThrow } from '../../utils/validation';

async function reportBook(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { id } = req.params;
  const reporterId = req.user?.uid;

  if (!reporterId) throw BadRequest('Usuario no autenticado.');

  try {
    const { type, description, contactEmail } = parseOrThrow(reportBookSchema, req.body);
    await ReportService.reportBook({
      bookId: id,
      reporterId,
      type,
      description,
      contactEmail,
    });

    return res.status(201).json({
      success: {
        status: 201,
        message: 'Reporte recibido. Vamos a revisarlo.',
      },
    });
  } catch (err) {
    return next(err) as any;
  }
}

export { reportBook };
