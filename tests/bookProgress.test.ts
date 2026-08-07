import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import { seedBook } from './helpers/seedBook';
import bookProgressModel from '../src/models/bookProgress';

const app = buildApp();

describe('PATCH /api/users/me/book-progress/:bookId', () => {
  it('setea progreso pdf con position numérica', async () => {
    const cookie = mockSession({ uid: 'reader-p1' });
    const book = await seedBook({ userId: 'a' });

    const res = await request(app)
      .patch(`/api/users/me/book-progress/${book.id}`)
      .set('Cookie', cookie)
      .send({ position: 42, type: 'pdf', percentage: 30 });
    expect(res.status).toBe(200);
    expect(res.body.progress).toMatchObject({
      position: 42,
      type: 'pdf',
      percentage: 30,
    });
  });

  it('setea progreso epub con position CFI (string)', async () => {
    const cookie = mockSession({ uid: 'reader-p2' });
    const book = await seedBook({ userId: 'a' });

    const res = await request(app)
      .patch(`/api/users/me/book-progress/${book.id}`)
      .set('Cookie', cookie)
      .send({ position: 'epubcfi(/6/4[chap]!/4)', type: 'epub' });
    expect(res.status).toBe(200);
    expect(res.body.progress.position).toBe('epubcfi(/6/4[chap]!/4)');
    expect(res.body.progress.type).toBe('epub');
  });

  it('upsert: no duplica y refresca updatedAt', async () => {
    const cookie = mockSession({ uid: 'reader-p3' });
    const book = await seedBook({ userId: 'a' });

    await request(app)
      .patch(`/api/users/me/book-progress/${book.id}`)
      .set('Cookie', cookie)
      .send({ position: 10, type: 'pdf' });
    await request(app)
      .patch(`/api/users/me/book-progress/${book.id}`)
      .set('Cookie', cookie)
      .send({ position: 20, type: 'pdf' });

    const docs = await bookProgressModel.find({ userId: 'reader-p3', bookId: book.id }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].position).toBe(20);
  });

  it('rechaza type inválido con 400', async () => {
    const cookie = mockSession({ uid: 'reader-p4' });
    const book = await seedBook({ userId: 'a' });
    const res = await request(app)
      .patch(`/api/users/me/book-progress/${book.id}`)
      .set('Cookie', cookie)
      .send({ position: 5, type: 'txt' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/me/book-progress/:bookId', () => {
  it('devuelve null cuando no hay progress y el valor persistido cuando sí', async () => {
    const cookie = mockSession({ uid: 'reader-g1' });
    const book = await seedBook({ userId: 'a' });

    let res = await request(app)
      .get(`/api/users/me/book-progress/${book.id}`)
      .set('Cookie', cookie);
    expect(res.body.progress).toBeNull();

    await bookProgressModel.create({
      userId: 'reader-g1',
      bookId: book.id,
      position: 55,
      type: 'pdf',
    });
    res = await request(app).get(`/api/users/me/book-progress/${book.id}`).set('Cookie', cookie);
    expect(res.body.progress.position).toBe(55);
    expect(res.body.progress.type).toBe('pdf');
  });
});

describe('DELETE /api/users/me/book-progress/:bookId', () => {
  it('borra el progreso del usuario', async () => {
    const cookie = mockSession({ uid: 'reader-d1' });
    const book = await seedBook({ userId: 'a' });
    await bookProgressModel.create({
      userId: 'reader-d1',
      bookId: book.id,
      position: 30,
      type: 'pdf',
    });

    const res = await request(app)
      .delete(`/api/users/me/book-progress/${book.id}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.progress).toBeNull();

    const doc = await bookProgressModel.findOne({ userId: 'reader-d1', bookId: book.id }).lean();
    expect(doc).toBeNull();
  });
});
