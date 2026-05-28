import { Request, Response, NextFunction } from 'express';

import { UserService } from '../../../services/userService';
import { AuthService } from '../../../services/authService';

const isProduction = process.env.NODE_ENV === 'production';
const DOMAIN = process.env.COOKIE_DOMAIN;

const cookieConfig = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax',
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

    if (!idToken) {
      return res.status(400).json({ message: 'Token requerido' });
    }

    const sessionCookie = await AuthService.createSessionCookie(idToken);

    res.cookie('_secure_tk', sessionCookie, {
      ...cookieConfig,
      maxAge: AuthService.sessionDurationMs,
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
      await AuthService.verifySessionCookie(session);
    } catch {
      return res.status(401).json({ message: 'Sesión inválida' });
    }

    if (req.user?.uid) {
      await AuthService.revokeUserSessions(req.user.uid);
    }

    res.clearCookie('_secure_tk', cookieConfig);

    return res.status(200).json({ message: 'Logout exitoso' });
  } catch (err) {
    return next(err);
  }
}

async function refreshSession(req: Request, res: Response, next: NextFunction) {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ message: 'Token requerido' });
    }

    try {
      const sessionCookie = await AuthService.createSessionCookie(idToken);

      res.cookie('_secure_tk', sessionCookie, {
        ...cookieConfig,
        maxAge: AuthService.sessionDurationMs,
      });

      return res.status(200).json({ auth: true });
    } catch {
      res.clearCookie('_secure_tk', cookieConfig);
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
  } catch (err) {
    return next(err);
  }
}

export { createUser, login, logoutUser, refreshSession };
