import { Request, Response, NextFunction } from 'express';

import { authFirebase } from '../../config/firebase';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    const session = req.cookies?._secure_tk;
    const refreshToken = req.cookies?._refresh_tk;

    if (!session) {
      return res.status(401).json({ auth: false });
    }

    try {
      const decoded = await authFirebase.verifySessionCookie(session, true);
      req.user = decoded;
      return next();
    } catch (error: any) {
      // Si la sesión expiró pero hay refresh token, intentar renovar
      if (refreshToken && error.code === 'auth/argument-error') {
        try {
          // El refreshToken es el idToken guardado, usarlo para crear una nueva sesión
          const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 días
          const newSessionCookie = await authFirebase.createSessionCookie(refreshToken, {
            expiresIn: expiresIn,
          });

          res.cookie('_secure_tk', newSessionCookie, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            maxAge: expiresIn,
          });

          const decoded = await authFirebase.verifySessionCookie(newSessionCookie, true);
          req.user = decoded;
          return next();
        } catch {
          res.clearCookie('_secure_tk');
          res.clearCookie('_refresh_tk');
          return res.status(401).json({ message: 'Sesión expirada, reautentícate' });
        }
      }

      res.clearCookie('_secure_tk');
      res.clearCookie('_refresh_tk');
      return res.status(401).json({ message: 'Sesión inválida' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Error en autenticación' });
  }
}
