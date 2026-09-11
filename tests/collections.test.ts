import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import { seedBook } from './helpers/seedBook';
import collectionsModel from '../src/models/collections';

const app = buildApp();

describe('POST /api/users/collections/:userId', () => {
  it('crea una colección nueva', async () => {
    const cookie = mockSession({ uid: 'col-user-1' });
    const res = await request(app)
      .post('/api/users/collections/col-user-1')
      .set('Cookie', cookie)
      .send({ name: 'Favoritos de terror' });
    expect(res.status).toBe(201);

    const doc = await collectionsModel.findOne({ userId: 'col-user-1' }).lean();
    expect(doc?.collections?.[0]?.name).toBe('Favoritos de terror');
  });

  it('agregar una segunda colección al mismo doc del usuario', async () => {
    const cookie = mockSession({ uid: 'col-user-2' });
    await request(app)
      .post('/api/users/collections/col-user-2')
      .set('Cookie', cookie)
      .send({ name: 'Uno' });
    await request(app)
      .post('/api/users/collections/col-user-2')
      .set('Cookie', cookie)
      .send({ name: 'Dos' });

    const docs = await collectionsModel.find({ userId: 'col-user-2' }).lean();
    expect(docs).toHaveLength(1);
    expect(docs[0].collections?.map((c) => c.name)).toEqual(['Uno', 'Dos']);
  });
});

describe('PATCH /api/users/collections/collection/:collectionId (rename)', () => {
  it('renombra una colección del owner', async () => {
    const cookie = mockSession({ uid: 'col-user-3' });
    const doc = await collectionsModel.create({
      userId: 'col-user-3',
      collections: [{ name: 'Viejo nombre', books: [] }],
    });
    const colId = (doc.collections as { _id?: unknown }[])[0]._id as string;

    const res = await request(app)
      .patch(`/api/users/collections/collection/${colId}`)
      .set('Cookie', cookie)
      .send({ userId: 'col-user-3', name: 'Nuevo nombre' });
    expect(res.status).toBe(200);

    const after = await collectionsModel.findOne({ userId: 'col-user-3' }).lean();
    expect(after?.collections?.[0]?.name).toBe('Nuevo nombre');
  });
});

describe('PATCH /api/users/collections/books/toggle', () => {
  it('agrega un libro a una colección', async () => {
    const cookie = mockSession({ uid: 'col-user-4' });
    const book = await seedBook({ userId: 'author-c' });
    const doc = await collectionsModel.create({
      userId: 'col-user-4',
      collections: [{ name: 'Mi lista', books: [] }],
    });
    const colId = (doc.collections as { _id?: unknown }[])[0]._id as string;

    const res = await request(app)
      .patch('/api/users/collections/books/toggle')
      .set('Cookie', cookie)
      .send({
        userId: 'col-user-4',
        bookId: book.id,
        checked: true,
        collections: [
          {
            collectionId: colId,
            collectionName: 'Mi lista',
            isInCollection: true,
          },
        ],
      });
    expect(res.status).toBe(200);

    const after = await collectionsModel.findOne({ userId: 'col-user-4' }).lean();
    const books = (after?.collections?.[0] as any)?.books ?? [];
    expect(books.map((b: any) => String(b.bookId))).toContain(book.id);
  });

  it('remueve un libro de la colección cuando isInCollection=false', async () => {
    const cookie = mockSession({ uid: 'col-user-5' });
    const book = await seedBook({ userId: 'author-c' });
    const doc = await collectionsModel.create({
      userId: 'col-user-5',
      collections: [{ name: 'Mi lista', books: [{ bookId: book._id }] }],
    });
    const colId = (doc.collections as { _id?: unknown }[])[0]._id as string;

    const res = await request(app)
      .patch('/api/users/collections/books/toggle')
      .set('Cookie', cookie)
      .send({
        userId: 'col-user-5',
        bookId: book.id,
        checked: false,
        collections: [
          {
            collectionId: colId,
            collectionName: 'Mi lista',
            isInCollection: false,
          },
        ],
      });
    expect(res.status).toBe(200);

    const after = await collectionsModel.findOne({ userId: 'col-user-5' }).lean();
    const books = (after?.collections?.[0] as any)?.books ?? [];
    expect(books.map((b: any) => String(b.bookId))).not.toContain(book.id);
  });
});

describe('DELETE /api/users/collections/:userId/collection/:collectionId', () => {
  it('borra una colección específica sin tocar las demás', async () => {
    const cookie = mockSession({ uid: 'col-user-6' });
    const doc = await collectionsModel.create({
      userId: 'col-user-6',
      collections: [
        { name: 'Uno', books: [] },
        { name: 'Dos', books: [] },
      ],
    });
    const colId = (doc.collections as { _id?: unknown }[])[0]._id as string;

    const res = await request(app)
      .delete(`/api/users/collections/col-user-6/collection/${colId}`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);

    const after = await collectionsModel.findOne({ userId: 'col-user-6' }).lean();
    expect(after?.collections).toHaveLength(1);
    expect(after?.collections?.[0]?.name).toBe('Dos');
  });
});

describe('GET /api/users/collections/:userId', () => {
  it('lista las colecciones del usuario', async () => {
    const cookie = mockSession({ uid: 'col-user-7' });
    const book = await seedBook({ userId: 'author-d' });
    await collectionsModel.create({
      userId: 'col-user-7',
      collections: [
        { name: 'Con libros', books: [{ bookId: book._id, checked: true }] },
        { name: 'Vacía', books: [] },
      ],
    });

    const res = await request(app).get('/api/users/collections/col-user-7').set('Cookie', cookie);

    expect(res.status).toBe(200);

    expect(res.body.totalCollections).toBe(2);
    expect(res.body.collections.map((c: any) => c.name).sort()).toEqual(['Con libros', 'Vacía']);
  });

  it('devuelve una lista vacía para un usuario sin colecciones', async () => {
    const cookie = mockSession({ uid: 'col-user-8' });

    const res = await request(app).get('/api/users/collections/col-user-8').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.collections).toEqual([]);
  });
});
