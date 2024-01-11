import { Request, Response, NextFunction } from 'express';
import { authFirebase } from '../services/firebase';

const auth = authFirebase;

export async function verifyToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = (req.headers['authorization'] || '').split(' ')[1];
    const { userId } = req.params;

    // Verificar si el token está presente
    if (!token) {
      return res.status(401).json({ error: { message: 'Token no proporcionado' } });
    }

    // Verificar el token utilizando la API de autenticación de Firebase
    const decodedToken = await auth.verifyIdToken(token);

    // Verificar si el usuario en la solicitud es el mismo que el del token
    if (decodedToken && userId === decodedToken.uid) {
      next();
    } else {
      res.status(403).json({ error: { message: 'Acceso denegado' } });
    }
  } catch (error) {
    // Si hay un error al verificar el token, responde con un código de error
    res.status(401).json({ error: { message: 'Token inválido' } });
  }
}
