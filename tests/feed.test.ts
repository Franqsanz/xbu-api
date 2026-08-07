import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession, clearSession } from './helpers/session';
import { seedUser } from './helpers/seedUser';
import { seedBook } from './helpers/seedBook';
import { seedComment } from './helpers/seedComment';

import followsModel from '../src/models/follows';
import bookStatusesModel from '../src/models/bookStatuses';
import bookRatingsModel from '../src/models/bookRatings';
import activityLogModel from '../src/models/activityLog';

const app = buildApp();

/**
 * Setup común: `me` sigue a `other`, y el feed muestra actividades de `other`
 * (y las propias de `me`). El feed NO muestra los follows emitidos por `me`
 * — solo los de los usuarios que sigo — así que los tests de follow-activity
 * usan un tercer usuario al que `other` sigue.
 */
async function seedGraph() {
  await seedUser({ uid: 'me', username: 'me_user' });
  await seedUser({ uid: 'other', username: 'other_user' });
  await followsModel.create({ follower: 'me', following: 'other' });
}

describe('GET /api/users/me/feed — auth', () => {
  it('devuelve 401 sin sesión', async () => {
    clearSession();
    const res = await request(app).get('/api/users/me/feed');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/me/feed — merge y orden', () => {
  beforeEach(async () => {
    await seedGraph();
  });

  it('mezcla actividades de los usuarios que sigo y las mías, ordenadas DESC por createdAt', async () => {
    const cookie = mockSession({ uid: 'me' });

    // Cada actividad sobre un libro distinto para que el agrupamiento
    // (actor+libro+día) no las colapse.
    const otherBook = await seedBook({ userId: 'other', pathUrl: 'other-book' });
    const commentBook = await seedBook({
      userId: 'author-x',
      pathUrl: 'comment-book',
    });
    const ratedBook = await seedBook({ userId: 'author-y', pathUrl: 'rated-book' });

    await seedComment({
      bookId: commentBook.id,
      author: { userId: 'me', username: 'me_user' },
    });
    await bookRatingsModel.create({
      userId: 'other',
      bookId: ratedBook.id,
      rating: 5,
    });

    const res = await request(app).get('/api/users/me/feed').set('Cookie', cookie);
    expect(res.status).toBe(200);

    const acts = res.body.activities as Array<{ type: string; createdAt: string }>;
    expect(acts.length).toBeGreaterThanOrEqual(3);
    // Orden descendente estricto
    for (let i = 1; i < acts.length; i++) {
      expect(new Date(acts[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(acts[i].createdAt).getTime()
      );
    }
    // Los 3 tipos están presentes (no se agruparon)
    const types = new Set(acts.map((a) => a.type));
    expect(types.has('book')).toBe(true);
    expect(types.has('comment')).toBe(true);
    expect(types.has('rating')).toBe(true);
    // Datos que no tengo que usar directamente
    void otherBook;
  });

  it('agrupa 2+ actividades del mismo (actor+libro+día) bajo type=group', async () => {
    const cookie = mockSession({ uid: 'me' });

    const book = await seedBook({ userId: 'other', pathUrl: 'grouped-book' });
    // Tres acciones del mismo actor sobre el mismo libro el mismo día
    await bookStatusesModel.create({
      userId: 'other',
      bookId: book.id,
      status: 'reading',
    });
    await bookRatingsModel.create({
      userId: 'other',
      bookId: book.id,
      rating: 4,
    });
    await activityLogModel.create({
      userId: 'other',
      type: 'favorite',
      bookId: book.id,
    });

    const res = await request(app).get('/api/users/me/feed').set('Cookie', cookie);
    expect(res.status).toBe(200);

    const acts = res.body.activities as Array<{
      type: string;
      actor?: { username: string };
      book?: { pathUrl: string };
      activities?: unknown[];
    }>;
    const group = acts.find((a) => a.type === 'group' && a.book?.pathUrl === 'grouped-book');
    expect(group).toBeDefined();
    expect(group?.activities?.length).toBeGreaterThanOrEqual(2);
    // No queda ninguna suelta con ese actor+libro (todas fueron agrupadas)
    const stragglers = acts.filter(
      (a) =>
        a.type !== 'group' &&
        a.actor?.username === 'other_user' &&
        a.book?.pathUrl === 'grouped-book'
    );
    expect(stragglers).toHaveLength(0);
  });

  it('incluye follow activities de usuarios que sigo pero no las mías', async () => {
    const cookie = mockSession({ uid: 'me' });
    await seedUser({ uid: 'third', username: 'third_user' });
    // `other` (a quien sigo) sigue a `third` — este follow SÍ debe aparecer
    await followsModel.create({ follower: 'other', following: 'third' });

    const res = await request(app).get('/api/users/me/feed').set('Cookie', cookie);
    const acts = res.body.activities as Array<{
      type: string;
      actor?: { username: string };
      target?: { username: string };
    }>;

    const otherFollowsThird = acts.find(
      (a) =>
        a.type === 'follow' &&
        a.actor?.username === 'other_user' &&
        a.target?.username === 'third_user'
    );
    expect(otherFollowsThird).toBeDefined();

    // Mi propio follow (me → other) NO aparece
    const myOwnFollow = acts.find((a) => a.type === 'follow' && a.actor?.username === 'me_user');
    expect(myOwnFollow).toBeUndefined();
  });
});

describe('GET /api/users/me/feed — paginación', () => {
  beforeEach(async () => {
    await seedGraph();
    // 8 libros de `other` para tener suficientes items en el feed sin que
    // se agrupen entre sí (distintos pathUrl → distintos buckets)
    for (let i = 0; i < 8; i++) {
      await seedBook({ userId: 'other', pathUrl: `feed-book-${i}` });
    }
  });

  it('modo cursor: primera página devuelve nextCursor y hasMore=true', async () => {
    const cookie = mockSession({ uid: 'me' });
    const res = await request(app).get('/api/users/me/feed?limit=3').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.activities).toHaveLength(3);
    // El feed NO devuelve `total` en cursor mode (el merge no admite count
    // real sin recorrer todas las colecciones — usar `?page=N` si hace falta).
    expect(res.body.info.total).toBeUndefined();
    expect(res.body.info.hasMore).toBe(true);
    expect(res.body.info.nextCursor).toBeTruthy();
    expect(res.body.info.nextUrl).toContain('cursor=');
  });

  it('modo cursor: segunda página devuelve items más viejos que el cursor', async () => {
    const cookie = mockSession({ uid: 'me' });
    const first = await request(app).get('/api/users/me/feed?limit=3').set('Cookie', cookie);
    const firstIds = first.body.activities.map(
      (a: { book: { pathUrl: string } }) => a.book?.pathUrl
    );

    const cursor = first.body.info.nextCursor as string;
    const second = await request(app)
      .get(`/api/users/me/feed?limit=3&cursor=${cursor}`)
      .set('Cookie', cookie);
    expect(second.status).toBe(200);
    expect(second.body.activities).toHaveLength(3);
    // No solapa con la primera página
    const secondIds = second.body.activities.map(
      (a: { book: { pathUrl: string } }) => a.book?.pathUrl
    );
    expect(secondIds.some((id: string) => firstIds.includes(id))).toBe(false);
    // Todas las páginas exponen `hasMore` — false cuando ya no hay siguiente
    expect(typeof second.body.info.hasMore).toBe('boolean');
  });

  it('modo cursor: cursor inválido devuelve 400', async () => {
    const cookie = mockSession({ uid: 'me' });
    const res = await request(app)
      .get('/api/users/me/feed?cursor=notavalidbase64!')
      .set('Cookie', cookie);
    expect(res.status).toBe(400);
  });

  it('modo page: devuelve totalPages, currentPage y nextPage', async () => {
    const cookie = mockSession({ uid: 'me' });
    const res = await request(app).get('/api/users/me/feed?page=1&limit=3').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.activities).toHaveLength(3);
    expect(res.body.info.total).toBe(8);
    expect(res.body.info.totalPages).toBe(3);
    expect(res.body.info.currentPage).toBe(1);
    expect(res.body.info.nextPage).toBe(2);
    expect(res.body.info.prevPage).toBeNull();
  });

  it('modo page: última página tiene nextPage null y menos items', async () => {
    const cookie = mockSession({ uid: 'me' });
    const res = await request(app).get('/api/users/me/feed?page=3&limit=3').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.activities).toHaveLength(2); // 8 - 6 = 2
    expect(res.body.info.nextPage).toBeNull();
    expect(res.body.info.prevPage).toBe(2);
  });
});
