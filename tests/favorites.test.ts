import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import { seedBook } from './helpers/seedBook';
import favoritesModel from '../src/models/favorites';

const app = buildApp();

describe('PATCH /api/users/favorites — toggle', () => {
  it('isFavorite=true agrega el libro al array del usuario', async () => {
    const cookie = mockSession({ uid: 'fav-user-1' });
    const book = await seedBook({ userId: 'author' });

    const res = await request(app)
      .patch('/api/users/favorites')
      .set('Cookie', cookie)
      .send({ userId: 'fav-user-1', id: book.id, isFavorite: true });
    expect(res.status).toBe(200);

    const doc = await favoritesModel.findOne({ userId: 'fav-user-1' }).lean();
    expect(doc?.favoriteBooks?.map(String)).toContain(book.id);
  });

  it('isFavorite=false remueve el libro del array', async () => {
    const cookie = mockSession({ uid: 'fav-user-2' });
    const book = await seedBook({ userId: 'author' });
    await favoritesModel.create({
      userId: 'fav-user-2',
      favoriteBooks: [book._id],
    });

    const res = await request(app)
      .patch('/api/users/favorites')
      .set('Cookie', cookie)
      .send({ userId: 'fav-user-2', id: book.id, isFavorite: false });
    expect(res.status).toBe(200);

    const doc = await favoritesModel.findOne({ userId: 'fav-user-2' }).lean();
    expect(doc?.favoriteBooks?.map(String)).not.toContain(book.id);
  });

  it('agregar el mismo libro dos veces no duplica en el array', async () => {
    const cookie = mockSession({ uid: 'fav-user-3' });
    const book = await seedBook({ userId: 'author' });

    await request(app)
      .patch('/api/users/favorites')
      .set('Cookie', cookie)
      .send({ userId: 'fav-user-3', id: book.id, isFavorite: true });
    await request(app)
      .patch('/api/users/favorites')
      .set('Cookie', cookie)
      .send({ userId: 'fav-user-3', id: book.id, isFavorite: true });

    const doc = await favoritesModel.findOne({ userId: 'fav-user-3' }).lean();
    const ids = (doc?.favoriteBooks ?? []).map(String);
    expect(ids.filter((id) => id === book.id)).toHaveLength(1);
  });

  it('rechaza 401 sin sesión', async () => {
    const book = await seedBook({ userId: 'author' });
    const res = await request(app)
      .patch('/api/users/favorites')
      .send({ userId: 'anon', id: book.id, isFavorite: true });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/favorites/:userId', () => {
  it('lista los libros favoritos con paginación', async () => {
    const cookie = mockSession({ uid: 'reader' });
    const b1 = await seedBook({ userId: 'a', pathUrl: 'b1' });
    const b2 = await seedBook({ userId: 'a', pathUrl: 'b2' });
    const b3 = await seedBook({ userId: 'a', pathUrl: 'b3' });
    await favoritesModel.create({
      userId: 'reader',
      favoriteBooks: [b1._id, b2._id, b3._id],
    });

    const res = await request(app)
      .get('/api/users/favorites/reader?page=1&limit=10')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThanOrEqual(3);
    expect(res.body.info.totalBooks).toBe(3);
  });
});
