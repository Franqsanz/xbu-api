import { Request, Response, NextFunction } from 'express';

import { authFirebase } from '../../config/firebase';

declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const DOMAIN = process.env.COOKIE_DOMAIN;

const cookieConfig = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  domain: isProduction ? DOMAIN : undefined,
};

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
      if (refreshToken && error.code === 'auth/argument-error') {
        try {
          const expiresIn = 5 * 24 * 60 * 60 * 1000;
          const newSessionCookie = await authFirebase.createSessionCookie(refreshToken, {
            expiresIn,
          });

          res.cookie('_secure_tk', newSessionCookie, {
            ...cookieConfig,
            maxAge: expiresIn,
          });

          const decoded = await authFirebase.verifySessionCookie(newSessionCookie, true);
          req.user = decoded;
          return next();
        } catch {
          res.clearCookie('_secure_tk', cookieConfig);
          res.clearCookie('_refresh_tk', cookieConfig);
          return res.status(401).json({ message: 'Sesión expirada, reautentícate' });
        }
      }

      res.clearCookie('_secure_tk', cookieConfig);
      res.clearCookie('_refresh_tk', cookieConfig);
      return res.status(401).json({ message: 'Sesión inválida' });
    }
  } catch (error) {
    return res.status(401).json({ message: 'Error en autenticación' });
  }
}
