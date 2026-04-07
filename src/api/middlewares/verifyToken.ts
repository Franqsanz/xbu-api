import { Request, Response, NextFunction } from 'express';

import { authFirebase } from '../../config/firebase';
import { Forbidden, UnauthorizedAccess } from '../../utils/errors';

const auth = authFirebase;

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    // Buscar token en cookie (sistema actual)
    const session = req.cookies?._secure_tk;
    const { userId } = req.params;

    // Verificar si la sesión está presente
    if (!session) {
      throw UnauthorizedAccess('Token no proporcionado');
    }

    // Verificar la sesión mediante Firebase
    const decoded = await auth.verifySessionCookie(session, true);

    // Verificar si el usuario en la solicitud es el mismo que el de la sesión
    if (decoded && userId === decoded.uid) {
      req.user = decoded;
      return next();
    } else {
      throw Forbidden('Acceso denegado');
    }
  } catch (err) {
    // Si hay un error al verificar el token, responde con un código de error
    // res.status(401).json({
    //   error: {
    //     message: 'Token inválido',
    //   },
    // });
    // throw UnauthorizedAccess('Token inválido');
    return next(err);
  }
}
