import { Request, Response, NextFunction } from 'express';

import { authFirebase } from '../../config/firebase';
import { Forbidden, UnauthorizedAccess } from '../../utils/errors';

const auth = authFirebase;

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Buscar token en cookie
    const session = req.cookies?._secure_tk;
    const { userId } = req.params;

    // Verificar si la sesión está presente
    if (!session) {
      throw UnauthorizedAccess('Token no proporcionado');
    }

    // Verificar la sesión mediante Firebase
    const decoded = await auth.verifySessionCookie(session, true);

    if (!decoded) {
      throw UnauthorizedAccess('Token inválido');
    }

    // Si hay userId en parámetros, verificar que coincida con el token
    // Si no hay userId (ej: /me), solo verificamos que el token sea válido
    if (userId && userId !== decoded.uid) {
      throw Forbidden('Acceso denegado');
    }

    req.user = decoded;
    return next();
  } catch (err) {
    return next(err);
  }
}
