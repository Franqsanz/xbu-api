import { Request, Response, NextFunction } from 'express';
import { authFirebase } from '../../../config/firebase';
import { UserService } from '../../../services/userService';

const isProduction = process.env.NODE_ENV === 'production';
const DOMAIN = process.env.COOKIE_DOMAIN;

const cookieConfig = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  domain: isProduction ? DOMAIN : undefined,
};

async function createUser(req: Request, res: Response, next: NextFunction) {
  const { username } = req.body;

  try {
    const { existingUser, saveUser } = await UserService.saveUser(req.user, username);

    if (existingUser) {
      return res.status(200).json({
        info: {
          message: 'Usuario ya registrado',
          user: existingUser,
        },
      });
    }

    return res.status(200).json(saveUser);
  } catch (err) {
    return next(err);
  }
}

async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = req.body;
    const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 días
    const refreshExpiresIn = 30 * 24 * 60 * 60 * 1000; // 30 días

    if (!idToken) {
      return res.status(400).json({ message: 'Token requerido' });
    }

    const sessionCookie = await authFirebase.createSessionCookie(idToken, {
      expiresIn,
    });

    res.cookie('_secure_tk', sessionCookie, {
      ...cookieConfig,
      maxAge: expiresIn,
    });

    res.cookie('_refresh_tk', idToken, {
      ...cookieConfig,
      maxAge: refreshExpiresIn,
    });

    return res.status(200).json({ auth: true });
  } catch (err) {
    return next(err);
  }
}

async function logoutUser(req: Request, res: Response, next: NextFunction) {
  try {
    const session = req.cookies?._secure_tk;

    if (!session) {
      return res.status(401).json({ message: 'No hay sesión activa' });
    }

    try {
      await authFirebase.verifySessionCookie(session, true);
    } catch {
      return res.status(401).json({ message: 'Sesión inválida' });
    }

    if (req.user?.uid) {
      try {
        await authFirebase.revokeRefreshTokens(req.user.uid);
      } catch (error) {
        console.error('Error revocando tokens en Firebase:', error);
      }
    }

    res.clearCookie('_secure_tk', cookieConfig);
    res.clearCookie('_refresh_tk', cookieConfig);

    return res.status(200).json({ message: 'Logout exitoso' });
  } catch (err) {
    return next(err);
  }
}

async function refreshSession(req: Request, res: Response, next: NextFunction) {
  try {
    const refreshToken = req.cookies?._refresh_tk;

    if (!refreshToken) {
      return res.status(401).json({ message: 'No hay refresh token' });
    }

    try {
      const expiresIn = 5 * 24 * 60 * 60 * 1000; // 5 días

      const sessionCookie = await authFirebase.createSessionCookie(refreshToken, {
        expiresIn,
      });

      res.cookie('_secure_tk', sessionCookie, {
        ...cookieConfig,
        maxAge: expiresIn,
      });

      return res.status(200).json({ auth: true });
    } catch (error) {
      res.clearCookie('_secure_tk', cookieConfig);
      res.clearCookie('_refresh_tk', cookieConfig);

      return res.status(401).json({ message: 'Refresh token inválido o expirado' });
    }
  } catch (err) {
    return next(err);
  }
}

export { createUser, login, logoutUser, refreshSession };
