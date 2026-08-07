import usersModel from '../../src/models/users';

export interface SeedUserInput {
  uid: string;
  name?: string;
  username?: string;
  email?: string;
  picture?: string;
}

/**
 * Crea un user real en Mongo para que servicios que hacen
 * `UserRepository.findById(uid)` lo encuentren durante los tests.
 * Devuelve el doc creado.
 */
export async function seedUser(input: SeedUserInput) {
  const {
    uid,
    name = `Name ${uid}`,
    username = uid.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
    email = `${uid}@test.local`,
    picture = 'https://mock.cloudinary/test.webp',
  } = input;

  return await usersModel.create({
    uid,
    name,
    username,
    email,
    picture,
    createdAt: new Date(),
  });
}
