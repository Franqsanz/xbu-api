import { Request, Response, NextFunction } from 'express';

import { authFirebase } from '../../config/firebase';

/**
 * Middleware no-bloqueante: si hay sesión válida (cookie o Bearer)
 * setea `req.user`; si no hay o falla la verificación, continúa con
 * `req.user` undefined sin tirar error.
 *
 * Útil para endpoints que pueden enriquecer su respuesta con datos
 * del usuario actual pero también deben funcionar para visitas anónimas.
 */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const bearer = (req.headers['authorization'] || '').split(' ')[1];
  const session = req.cookies?._secure_tk;

  try {
    if (bearer) {
      const decoded = await authFirebase.verifyIdToken(bearer);
      req.user = decoded;
    } else if (session) {
      const decoded = await authFirebase.verifySessionCookie(session, true);
      req.user = decoded;
    }
  } catch {
    // Sesión inválida o expirada → tratamos como anónimo, sin bloquear
    req.user = undefined;
  }

  return next();
}
