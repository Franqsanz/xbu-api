import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import { seedBook } from './helpers/seedBook';
import reportsModel from '../src/models/reports';

const app = buildApp();

describe('POST /api/books/:id/report', () => {
  it('crea un reporte válido y devuelve 201', async () => {
    const cookie = mockSession({ uid: 'reporter-1' });
    const book = await seedBook({ userId: 'book-owner' });

    const res = await request(app).post(`/api/books/${book.id}/report`).set('Cookie', cookie).send({
      type: 'spam',
      contactEmail: 'me@example.com',
    });
    expect(res.status).toBe(201);

    const saved = await reportsModel.findOne({ bookId: book.id }).lean();
    expect(saved?.reporterId).toBe('reporter-1');
    expect(saved?.type).toBe('spam');
    expect(saved?.contactEmail).toBe('me@example.com');
  });

  it('rechaza reportar el propio libro con 400', async () => {
    const cookie = mockSession({ uid: 'self-owner' });
    const book = await seedBook({ userId: 'self-owner' });

    const res = await request(app).post(`/api/books/${book.id}/report`).set('Cookie', cookie).send({
      type: 'spam',
      contactEmail: 'x@y.com',
    });
    expect(res.status).toBe(400);
    expect(await reportsModel.findOne({ bookId: book.id }).lean()).toBeNull();
  });

  it('rechaza duplicado abierto del mismo reporter con 400', async () => {
    const cookie = mockSession({ uid: 'reporter-2' });
    const book = await seedBook({ userId: 'owner-2' });
    await reportsModel.create({
      bookId: book.id,
      reporterId: 'reporter-2',
      type: 'inappropriate',
      contactEmail: 'x@y.com',
    });

    const res = await request(app)
      .post(`/api/books/${book.id}/report`)
      .set('Cookie', cookie)
      .send({ type: 'spam', contactEmail: 'x@y.com' });
    expect(res.status).toBe(400);
  });

  it('type=other exige description', async () => {
    const cookie = mockSession({ uid: 'reporter-3' });
    const book = await seedBook({ userId: 'owner-3' });

    const res = await request(app)
      .post(`/api/books/${book.id}/report`)
      .set('Cookie', cookie)
      .send({ type: 'other', contactEmail: 'x@y.com' });
    expect(res.status).toBe(400);
  });

  it('rechaza contactEmail inválido con 400', async () => {
    const cookie = mockSession({ uid: 'reporter-4' });
    const book = await seedBook({ userId: 'owner-4' });

    const res = await request(app)
      .post(`/api/books/${book.id}/report`)
      .set('Cookie', cookie)
      .send({ type: 'spam', contactEmail: 'no-es-email' });
    expect(res.status).toBe(400);
  });

  it('rechaza libro inexistente con 404', async () => {
    const cookie = mockSession({ uid: 'reporter-5' });
    const res = await request(app)
      .post('/api/books/64abcdef1234567890abcdef/report')
      .set('Cookie', cookie)
      .send({ type: 'spam', contactEmail: 'x@y.com' });
    expect(res.status).toBe(404);
  });
});
