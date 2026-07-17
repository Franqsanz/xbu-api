import { Request, Response, NextFunction } from 'express';

import { ReportService } from '../../services/reportService';
import { BadRequest } from '../../utils/errors';

async function reportBook(req: Request, res: Response, next: NextFunction): Promise<any> {
  const { id } = req.params;
  const { type, description, contactEmail } = (req.body ?? {}) as {
    type?: string;
    description?: string;
    contactEmail?: string;
  };
  const reporterId = req.user?.uid;

  try {
    if (!reporterId) throw BadRequest('Usuario no autenticado.');
    if (!type) throw BadRequest('Falta el tipo de reporte.');

    await ReportService.reportBook({
      bookId: id,
      reporterId,
      type: type as any,
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
