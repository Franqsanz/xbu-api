import { Request, Response } from 'express';

import usersModel from '../../model/users';
import { authFirebase } from '../../server';

const auth = authFirebase;

async function postRegister(req: Request, res: Response) {
  const token = (req.headers['authorization'] || '').split(' ')[1];

  try {
    const decodedToken = await auth.verifyIdToken(token);

    // Verificar si el usuario ya está registrado
    const existingUser = await usersModel.findOne({ uid: decodedToken.uid });

    if (existingUser) {
      return res.status(200).json({ info: { message: 'Usuario ya registrado', user: existingUser } });
    }

    const userToSave = {
      ...decodedToken,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const newUser = new usersModel(userToSave);
    const resultUser = await newUser.save();

    return res.status(200).json(resultUser);
  } catch (error) {
    console.error(error);
    res.status(401).json({ error: { message: 'Token inválido' } });
  }
}

export { postRegister };
