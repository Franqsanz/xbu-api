import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import { seedBook } from './helpers/seedBook';
import bookRatingsModel from '../src/models/bookRatings';

const app = buildApp();

describe('PUT /api/books/:id/rating/me', () => {
  it('crea rating cuando el usuario aún no calificó', async () => {
    const cookie = mockSession({ uid: 'rater-1' });
    const book = await seedBook({ userId: 'author-a' });

    const res = await request(app)
      .put(`/api/books/${book.id}/rating/me`)
      .set('Cookie', cookie)
      .send({ rating: 4 });
    expect(res.status).toBe(200);
    expect(res.body.rating).toBe(4);

    const saved = await bookRatingsModel.findOne({ userId: 'rater-1', bookId: book.id }).lean();
    expect(saved?.rating).toBe(4);
  });

  it('upsert: segunda llamada actualiza el rating existente', async () => {
    const cookie = mockSession({ uid: 'rater-2' });
    const book = await seedBook({ userId: 'author-b' });

    await request(app)
      .put(`/api/books/${book.id}/rating/me`)
      .set('Cookie', cookie)
      .send({ rating: 3 });
    await request(app)
      .put(`/api/books/${book.id}/rating/me`)
      .set('Cookie', cookie)
      .send({ rating: 5 });

    const docs = await bookRatingsModel.find({ userId: 'rater-2', bookId: book.id }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].rating).toBe(5);
  });

  it('rechaza rating fuera de rango con 400', async () => {
    const cookie = mockSession({ uid: 'rater-3' });
    const book = await seedBook({ userId: 'author-c' });
    const res = await request(app)
      .put(`/api/books/${book.id}/rating/me`)
      .set('Cookie', cookie)
      .send({ rating: 9 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/books/:id/rating/me', () => {
  it('devuelve rating actual y null si no calificó', async () => {
    const cookie = mockSession({ uid: 'rater-4' });
    const book = await seedBook({ userId: 'author-d' });

    let res = await request(app).get(`/api/books/${book.id}/rating/me`).set('Cookie', cookie);
    expect(res.body.rating).toBeNull();

    await bookRatingsModel.create({ userId: 'rater-4', bookId: book.id, rating: 2 });
    res = await request(app).get(`/api/books/${book.id}/rating/me`).set('Cookie', cookie);
    expect(res.body.rating).toBe(2);
  });
});

describe('DELETE /api/books/:id/rating/me', () => {
  it('borra rating del usuario y deja null', async () => {
    const cookie = mockSession({ uid: 'rater-5' });
    const book = await seedBook({ userId: 'author-e' });
    await bookRatingsModel.create({ userId: 'rater-5', bookId: book.id, rating: 5 });

    const res = await request(app).delete(`/api/books/${book.id}/rating/me`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.rating).toBeNull();

    const doc = await bookRatingsModel.findOne({ userId: 'rater-5', bookId: book.id }).lean();
    expect(doc).toBeNull();
  });
});

describe('GET /api/books/:id/rating/stats', () => {
  it('devuelve promedio redondeado a 1 decimal y count', async () => {
    const book = await seedBook({ userId: 'author-stats' });
    await bookRatingsModel.create([
      { userId: 'r1', bookId: book.id, rating: 5 },
      { userId: 'r2', bookId: book.id, rating: 4 },
      { userId: 'r3', bookId: book.id, rating: 4 },
    ]);

    const res = await request(app).get(`/api/books/${book.id}/rating/stats`);
    expect(res.status).toBe(200);
    expect(res.body.ratingsCount).toBe(3);
    expect(res.body.averageRating).toBeCloseTo(4.3, 1);
  });

  it('libro sin ratings devuelve 0/0', async () => {
    const book = await seedBook({ userId: 'author-empty' });
    const res = await request(app).get(`/api/books/${book.id}/rating/stats`);
    expect(res.body).toEqual({ averageRating: 0, ratingsCount: 0 });
  });
});
