import { PDFDocument } from 'pdf-lib';

import { BadRequest } from './errors';
import { BookFileType } from '../types/types';

const PDF_MAGIC = Buffer.from('%PDF-');
const EPUB_MAGIC = Buffer.from('PK\x03\x04');

export type ParsedBookFile = {
  type: BookFileType;
  pages?: number;
};

export async function parseBookFile(buffer: Buffer): Promise<ParsedBookFile> {
  if (buffer.subarray(0, PDF_MAGIC.length).equals(PDF_MAGIC)) {
    try {
      const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true });
      return { type: 'pdf', pages: pdf.getPageCount() };
    } catch {
      throw BadRequest('No se pudo leer el archivo PDF.');
    }
  }

  // EPUB es un ZIP; magic ZIP no garantiza EPUB pero combinado con el MIME del
  // multer (ya filtrado a application/epub+zip) alcanza para esta validación.
  if (buffer.subarray(0, EPUB_MAGIC.length).equals(EPUB_MAGIC)) {
    return { type: 'epub' };
  }

  throw BadRequest('Formato de archivo no soportado. Debe ser PDF o EPUB.');
}
