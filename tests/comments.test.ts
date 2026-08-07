import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import { seedUser } from './helpers/seedUser';
import { seedBook } from './helpers/seedBook';
import { seedComment } from './helpers/seedComment';
import commentsModel from '../src/models/comments';

const app = buildApp();

function makeBook(userId = 'author-uid', slug = 'book-slug') {
  return seedBook({ userId, pathUrl: slug });
}

describe('POST /api/users/comments/comment', () => {
  it('crea un comentario top-level y lo persiste con parentId=null', async () => {
    const cookie = mockSession({ uid: 'reader-1' });
    await seedUser({ uid: 'reader-1', username: 'reader1' });
    const book = await makeBook('author-1', 'a-1');

    const res = await request(app)
      .post('/api/users/comments/comment')
      .set('Cookie', cookie)
      .send({
        text: 'me gustó mucho',
        bookId: book.id,
        author: { userId: 'reader-1' },
      });

    expect(res.status).toBe(201);
    const saved = await commentsModel.findOne({ bookId: book.id }).lean();
    expect(saved?.text).toBe('me gustó mucho');
    expect(saved?.parentId).toBeNull();
    expect(saved?.author.userId).toBe('reader-1');
    expect(saved?.author.username).toBe('reader1');
  });

  it('crea una respuesta y sube repliesCount del padre', async () => {
    const cookie = mockSession({ uid: 'reader-2' });
    await seedUser({ uid: 'reader-2', username: 'reader2' });
    const book = await makeBook('author-2', 'a-2');

    const parent = await seedComment({
      text: 'top level',
      bookId: book.id,
      author: { userId: 'author-2', name: 'Auth', username: 'auth' },
    });

    const res = await request(app)
      .post('/api/users/comments/comment')
      .set('Cookie', cookie)
      .send({
        text: 'respuesta',
        bookId: book.id,
        author: { userId: 'reader-2' },
        parentId: parent.id,
      });
    expect(res.status).toBe(201);

    const reply = await commentsModel.findOne({ bookId: book.id, parentId: parent.id }).lean();
    expect(reply?.text).toBe('respuesta');

    const parentAfter = await commentsModel.findById(parent._id).lean();
    expect(parentAfter?.repliesCount).toBe(1);
  });

  it('rechaza respuesta de respuesta (max 1 nivel)', async () => {
    const cookie = mockSession({ uid: 'reader-3' });
    await seedUser({ uid: 'reader-3', username: 'reader3' });
    const book = await makeBook('author-3', 'a-3');

    const top = await seedComment({
      bookId: book.id,
      author: { userId: 'author-3' },
    });
    const reply = await seedComment({
      text: 'r',
      bookId: book.id,
      parentId: top.id,
      author: { userId: 'author-3' },
    });

    const res = await request(app)
      .post('/api/users/comments/comment')
      .set('Cookie', cookie)
      .send({
        text: 'respuesta anidada',
        bookId: book.id,
        author: { userId: 'reader-3' },
        parentId: reply.id,
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rechaza 401 sin sesión', async () => {
    const book = await makeBook('author-x', 'a-x');
    const res = await request(app)
      .post('/api/users/comments/comment')
      .send({
        text: 'x',
        bookId: book.id,
        author: { userId: 'anon' },
      });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/users/comments/comment/:commentId/:userId', () => {
  it('edita el texto y marca isEdited=true cuando es el owner', async () => {
    const cookie = mockSession({ uid: 'author-4' });
    const book = await makeBook('author-4', 'a-4');
    const comment = await seedComment({
      text: 'original',
      bookId: book.id,
      author: { userId: 'author-4' },
    });

    const res = await request(app)
      .patch(`/api/users/comments/comment/${comment.id}/author-4`)
      .set('Cookie', cookie)
      .send({ text: 'editado' });
    expect(res.status).toBe(200);

    const after = await commentsModel.findById(comment.id).lean();
    expect(after?.text).toBe('editado');
    expect(after?.isEdited).toBe(true);
  });
});

describe('DELETE /api/users/comments/comment/:commentId/:userId', () => {
  it('borrar top-level también borra sus replies', async () => {
    const cookie = mockSession({ uid: 'author-5' });
    const book = await makeBook('author-5', 'a-5');
    const top = await seedComment({
      bookId: book.id,
      author: { userId: 'author-5' },
    });
    await seedComment({
      text: 'r1',
      bookId: book.id,
      parentId: top.id,
      author: { userId: 'author-5' },
    });
    await seedComment({
      text: 'r2',
      bookId: book.id,
      parentId: top.id,
      author: { userId: 'author-5' },
    });

    const res = await request(app)
      .delete(`/api/users/comments/comment/${top.id}/author-5`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);

    expect(await commentsModel.findById(top.id).lean()).toBeNull();
    const replies = await commentsModel.find({ parentId: top.id }).lean();
    expect(replies).toHaveLength(0);
  });

  it('borrar una reply decrementa repliesCount del padre', async () => {
    const cookie = mockSession({ uid: 'author-6' });
    const book = await makeBook('author-6', 'a-6');
    const top = await seedComment({
      bookId: book.id,
      repliesCount: 1,
      author: { userId: 'author-6' },
    });
    const reply = await seedComment({
      text: 'r',
      bookId: book.id,
      parentId: top.id,
      author: { userId: 'author-6' },
    });

    const res = await request(app)
      .delete(`/api/users/comments/comment/${reply.id}/author-6`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);

    const parentAfter = await commentsModel.findById(top.id).lean();
    expect(parentAfter?.repliesCount).toBe(0);
  });
});

describe('POST /api/users/comments/comment/:commentId/:userId/reaction', () => {
  async function seedReactionTarget(bookAuthor: string) {
    const book = await makeBook(bookAuthor, `book-${bookAuthor}`);
    return await seedComment({
      bookId: book.id,
      author: { userId: bookAuthor },
    });
  }

  it('sumar like actualiza likesCount a 1', async () => {
    const cookie = mockSession({ uid: 'reactor-1' });
    const comment = await seedReactionTarget('author-7');

    const res = await request(app)
      .post(`/api/users/comments/comment/${comment.id}/reactor-1/reaction`)
      .set('Cookie', cookie)
      .send({ type: 'like' });
    expect(res.status).toBe(200);

    const after = await commentsModel.findById(comment.id).lean();
    expect(after?.likesCount).toBe(1);
    expect(after?.dislikesCount).toBe(0);
  });

  it('el mismo like dos veces hace toggle y deja likesCount en 0', async () => {
    const cookie = mockSession({ uid: 'reactor-2' });
    const comment = await seedReactionTarget('author-8');

    await request(app)
      .post(`/api/users/comments/comment/${comment.id}/reactor-2/reaction`)
      .set('Cookie', cookie)
      .send({ type: 'like' });
    await request(app)
      .post(`/api/users/comments/comment/${comment.id}/reactor-2/reaction`)
      .set('Cookie', cookie)
      .send({ type: 'like' });

    const after = await commentsModel.findById(comment.id).lean();
    expect(after?.likesCount).toBe(0);
  });

  it('cambiar de like a dislike actualiza ambos contadores', async () => {
    const cookie = mockSession({ uid: 'reactor-3' });
    const comment = await seedReactionTarget('author-9');

    await request(app)
      .post(`/api/users/comments/comment/${comment.id}/reactor-3/reaction`)
      .set('Cookie', cookie)
      .send({ type: 'like' });
    await request(app)
      .post(`/api/users/comments/comment/${comment.id}/reactor-3/reaction`)
      .set('Cookie', cookie)
      .send({ type: 'dislike' });

    const after = await commentsModel.findById(comment.id).lean();
    expect(after?.likesCount).toBe(0);
    expect(after?.dislikesCount).toBe(1);
  });

  it('rechaza type inválido con 400', async () => {
    const cookie = mockSession({ uid: 'reactor-4' });
    const comment = await seedReactionTarget('author-10');

    const res = await request(app)
      .post(`/api/users/comments/comment/${comment.id}/reactor-4/reaction`)
      .set('Cookie', cookie)
      .send({ type: 'love' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/users/comments/book-comments/:bookId', () => {
  let bookId: string;
  beforeEach(async () => {
    const book = await makeBook('author-list', 'a-list');
    bookId = book.id;
    // 6 top-level + 2 replies (que no deberían aparecer en el listado top-level)
    for (let i = 0; i < 6; i++) {
      await seedComment({
        text: `top ${i}`,
        bookId,
        author: { userId: 'author-list' },
      });
    }
    const first = await commentsModel.findOne({ bookId, parentId: null }).lean();
    const firstId = String(first!._id);
    await seedComment({
      text: 'reply 1',
      bookId,
      parentId: firstId,
      author: { userId: 'author-list' },
    });
    await seedComment({
      text: 'reply 2',
      bookId,
      parentId: firstId,
      author: { userId: 'author-list' },
    });
  });

  it('modo cursor: devuelve solo top-level con nextCursor', async () => {
    const res = await request(app).get(`/api/users/comments/book-comments/${bookId}?limit=3`);
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
    expect(res.body.results.every((c: any) => c.parentId === null)).toBe(true);
    expect(res.body.info.totalComments).toBe(6);
    expect(res.body.info.nextCursor).toBeTruthy();
  });

  it('modo cursor: paginación completa recorre los 6 top-level', async () => {
    const collected: string[] = [];
    let cursor: string | null = null;
    let guard = 0;
    do {
      const res: request.Response = await request(app).get(
        `/api/users/comments/book-comments/${bookId}?limit=3${cursor ? `&cursor=${cursor}` : ''}`
      );
      collected.push(...res.body.results.map((c: { _id: string }) => c._id));
      cursor = res.body.info.nextCursor;
      guard++;
    } while (cursor && guard < 5);

    expect(collected).toHaveLength(6);
    expect(new Set(collected).size).toBe(6);
  });

  it('modo page: devuelve totalPages y currentPage', async () => {
    const res = await request(app).get(
      `/api/users/comments/book-comments/${bookId}?page=1&limit=3`
    );
    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(3);
    expect(res.body.info.total).toBe(6);
    expect(res.body.info.totalPages).toBe(2);
    expect(res.body.info.currentPage).toBe(1);
    expect(res.body.info.nextPage).toBe(2);
  });
});
