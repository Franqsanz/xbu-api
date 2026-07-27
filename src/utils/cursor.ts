import { Types } from 'mongoose';

/**
 * Codifica un cursor opaco para paginación keyset.
 *
 * Uso simple: solo `_id` (para listas que ordenan por `_id: -1`, que en
 * Mongo equivale a orden cronológico descendente porque el ObjectId
 * encapsula el timestamp).
 *
 * Uso compuesto: `createdAt|_id` cuando el orden principal es por otro
 * campo (createdAt, updatedAt, etc.) y usamos `_id` como tie-breaker
 * para desempatar cuando dos docs comparten el mismo valor.
 */

export function encodeIdCursor(id: string | Types.ObjectId): string {
  return Buffer.from(String(id), 'utf8').toString('base64url');
}

export function decodeIdCursor(cursor: string): string | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!Types.ObjectId.isValid(raw)) return null;
    return raw;
  } catch {
    return null;
  }
}

export function encodeCompositeCursor(date: Date, id: string | Types.ObjectId): string {
  const raw = `${date.toISOString()}|${String(id)}`;
  return Buffer.from(raw, 'utf8').toString('base64url');
}

export function decodeCompositeCursor(cursor: string): { date: Date; id: string } | null {
  try {
    const raw = Buffer.from(cursor, 'base64url').toString('utf8');
    const [dateStr, id] = raw.split('|');
    if (!dateStr || !id || !Types.ObjectId.isValid(id)) return null;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return { date, id };
  } catch {
    return null;
  }
}

/**
 * Cursor de solo-fecha, para feeds heterogéneos donde el id no es un
 * ObjectId único de una colección (ej. feed mezclado con groups sintéticos).
 */
export function encodeDateCursor(date: Date): string {
  return Buffer.from(date.toISOString(), 'utf8').toString('base64url');
}

export function decodeDateCursor(cursor: string): { date: Date } | null {
  try {
    const dateStr = Buffer.from(cursor, 'base64url').toString('utf8');
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;
    return { date };
  } catch {
    return null;
  }
}
