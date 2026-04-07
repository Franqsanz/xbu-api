import { Request, Response, NextFunction } from 'express';

// import usersModel from '../../../models/users';
import { authFirebase } from '../../../config/firebase';
import { UserService } from '../../../services/userService';
import { UnauthorizedAccess } from '../../../utils/errors';

const auth = authFirebase;

async function createUser(req: Request, res: Response, next: NextFunction) {
  // const token = (req.headers['authorization'] || '').split(' ')[1];
  const userId = req.user.uid;
  const { username } = req.body;

  try {
    // const decodedToken = await auth.verifyIdToken(token);
    const { existingUser, saveUser } = await UserService.saveUser(username, userId);

    if (existingUser) {
      return res.status(200).json({
        info: {
          message: 'Usuario ya registrado',
          user: existingUser,
        },
      });
    }

    // const userToSave = {
    //   ...decodedToken,
    //   username: username,
    //   createdAt: new Date(),
    // };

    // const newUser = new usersModel(userToSave);
    // const resultUser = await newUser.save();

    return res.status(200).json(saveUser);
  } catch (err) {
    // res.status(401).json({
    //   error: {
    //     message: 'Token inválido',
    //   },
    // });
    // throw UnauthorizedAccess('Token inválido');
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
      expiresIn: expiresIn,
    });

    // Cookie de sesión (corta duración)
    res.cookie('_secure_tk', sessionCookie, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: expiresIn,
    });

    // Cookie de refresh token (larga duración) - almacena el idToken para renovar
    res.cookie('_refresh_tk', idToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: refreshExpiresIn,
    });

    return res.status(200).json({ auth: true });
  } catch (err) {
    return next(err);
  }
}

async function logoutUser(req: Request, res: Response, next: NextFunction) {
  try {
    // Validar que el usuario esté autenticado
    const session = req.cookies?._secure_tk;

    if (!session) {
      return res.status(401).json({ message: 'No hay sesión activa' });
    }

    // Verificar que la sesión sea válida
    try {
      await authFirebase.verifySessionCookie(session, true);
    } catch {
      return res.status(401).json({ message: 'Sesión inválida' });
    }

    // Revocar tokens en Firebase (uid está en req.user si pasó por authMiddleware)
    if (req.user?.uid) {
      try {
        await authFirebase.revokeRefreshTokens(req.user.uid);
      } catch (error) {
        // Continuar incluso si la revocación falla
        console.error('Error revocando tokens en Firebase:', error);
      }
    }

    // Limpiar cookies
    res.clearCookie('_secure_tk', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    res.clearCookie('_refresh_tk', {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    });

    return res.status(200).json({
      message: 'Logout exitoso',
    });
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
        expiresIn: expiresIn,
      });

      res.cookie('_secure_tk', sessionCookie, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: expiresIn,
      });

      return res.status(200).json({ auth: true });
    } catch (error) {
      res.clearCookie('_secure_tk');
      res.clearCookie('_refresh_tk');
      return res.status(401).json({ message: 'Refresh token inválido o expirado' });
    }
  } catch (err) {
    return next(err);
  }
}

export { createUser, login, logoutUser, refreshSession };
