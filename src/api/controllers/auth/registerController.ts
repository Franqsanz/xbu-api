import { Request, Response, NextFunction } from 'express';

// import usersModel from '../../../models/users';
import { authFirebase } from '../../../config/firebase';
import { UserService } from '../../../services/userService';
import { UnauthorizedAccess } from '../../../utils/errors';

const auth = authFirebase;

async function createUser(req: Request, res: Response, next: NextFunction) {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  const { username } = req.body;

  try {
    const decodedToken = await auth.verifyIdToken(token);
    const { existingUser, saveUser } = await UserService.saveUser(username, decodedToken.uid);

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

export { createUser };
