import { Request, Response, NextFunction } from 'express';

import { authFirebase } from '../../config/firebase';
import { Forbidden, UnauthorizedAccess } from '../../utils/errors';

const auth = authFirebase;

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    const { userId } = req.params;

    // Verificar si el token está presente
    if (!token) {
      throw UnauthorizedAccess('Token no proporcionado');
    }

    // Verificar el token utilizando la API de autenticación de Firebase
    const decodedToken = await auth.verifyIdToken(token);

    // Verificar si el usuario en la solicitud es el mismo que el del token
    if (decodedToken && userId === decodedToken.uid) {
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
