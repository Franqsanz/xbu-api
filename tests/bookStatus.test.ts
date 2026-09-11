import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import { seedBook } from './helpers/seedBook';
import bookStatusesModel from '../src/models/bookStatuses';
import bookProgressModel from '../src/models/bookProgress';

const app = buildApp();

describe('PATCH /api/users/me/book-status/:bookId', () => {
  it('setea estado por primera vez', async () => {
    const cookie = mockSession({ uid: 'user-s1' });
    const book = await seedBook({ userId: 'a' });

    const res = await request(app)
      .patch(`/api/users/me/book-status/${book.id}`)
      .set('Cookie', cookie)
      .send({ status: 'reading' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('reading');

    const saved = await bookStatusesModel.findOne({ userId: 'user-s1', bookId: book.id }).lean();
    expect(saved?.status).toBe('reading');
  });

  it('upsert: cambia de reading a read sin duplicar', async () => {
    const cookie = mockSession({ uid: 'user-s2' });
    const book = await seedBook({ userId: 'a' });

    await request(app)
      .patch(`/api/users/me/book-status/${book.id}`)
      .set('Cookie', cookie)
      .send({ status: 'reading' });
    await request(app)
      .patch(`/api/users/me/book-status/${book.id}`)
      .set('Cookie', cookie)
      .send({ status: 'read' });

    const docs = await bookStatusesModel.find({ userId: 'user-s2', bookId: book.id }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].status).toBe('read');
  });

  it('rechaza status inválido con 400', async () => {
    const cookie = mockSession({ uid: 'user-s3' });
    const book = await seedBook({ userId: 'a' });
    const res = await request(app)
      .patch(`/api/users/me/book-status/${book.id}`)
      .set('Cookie', cookie)
      .send({ status: 'abandoned' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/me/book-status/:bookId', () => {
  it('devuelve null cuando no hay status y el valor persistido cuando sí', async () => {
    const cookie = mockSession({ uid: 'user-g1' });
    const book = await seedBook({ userId: 'a' });

    let res = await request(app).get(`/api/users/me/book-status/${book.id}`).set('Cookie', cookie);
    expect(res.body.status).toBeNull();

    await bookStatusesModel.create({
      userId: 'user-g1',
      bookId: book.id,
      status: 'want_to_read',
    });
    res = await request(app).get(`/api/users/me/book-status/${book.id}`).set('Cookie', cookie);
    expect(res.body.status).toBe('want_to_read');
  });
});

describe('DELETE /api/users/me/book-status/:bookId', () => {
  it('borra el status del usuario', async () => {
    const cookie = mockSession({ uid: 'user-d1' });
    const book = await seedBook({ userId: 'a' });
    await bookStatusesModel.create({
      userId: 'user-d1',
      bookId: book.id,
      status: 'reading',
    });

    const res = await request(app)
      .delete(`/api/users/me/book-status/${book.id}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.status).toBeNull();

    const doc = await bookStatusesModel.findOne({ userId: 'user-d1', bookId: book.id }).lean();
    expect(doc).toBeNull();
  });
});

describe('GET /api/users/me/book-status (listado por estado)', () => {
  it('devuelve los libros del estado pedido con kind y el progreso', async () => {
    const cookie = mockSession({ uid: 'user-s5' });
    const conProgreso = await seedBook({ userId: 'a', pathUrl: 'con-progreso' });
    const sinProgreso = await seedBook({ userId: 'a', pathUrl: 'sin-progreso' });

    await bookStatusesModel.create({
      userId: 'user-s5',
      bookId: conProgreso.id,
      status: 'reading',
    });
    await bookStatusesModel.create({
      userId: 'user-s5',
      bookId: sinProgreso.id,
      status: 'reading',
    });
    // El visor de EPUB no guarda porcentaje, así que tiene que poder faltar.
    await bookProgressModel.create({
      userId: 'user-s5',
      bookId: conProgreso.id,
      position: 42,
      type: 'pdf',
      percentage: 37,
    });

    const res = await request(app)
      .get('/api/users/me/book-status?status=reading')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.info.totalBooks).toBe(2);

    const byPath = Object.fromEntries(res.body.results.map((b: any) => [b.pathUrl, b]));
    expect(byPath['con-progreso'].percentage).toBe(37);
    expect(byPath['sin-progreso'].percentage).toBeUndefined();
    // `kind` alimenta el link del rail: original va al visor, reference a la ficha.
    expect(byPath['con-progreso'].kind).toBe('reference');
  });

  it('no mezcla los libros de otros usuarios ni de otros estados', async () => {
    const cookie = mockSession({ uid: 'user-s6' });
    const propio = await seedBook({ userId: 'a', pathUrl: 'propio' });
    const ajeno = await seedBook({ userId: 'a', pathUrl: 'ajeno' });
    const otroEstado = await seedBook({ userId: 'a', pathUrl: 'otro-estado' });

    await bookStatusesModel.create({
      userId: 'user-s6',
      bookId: propio.id,
      status: 'reading',
    });
    await bookStatusesModel.create({
      userId: 'otro-user',
      bookId: ajeno.id,
      status: 'reading',
    });
    await bookStatusesModel.create({
      userId: 'user-s6',
      bookId: otroEstado.id,
      status: 'want_to_read',
    });

    const res = await request(app)
      .get('/api/users/me/book-status?status=reading')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.results.map((b: any) => b.pathUrl)).toEqual(['propio']);
  });
});
