import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession, clearSession } from './helpers/session';
import { seedUser } from './helpers/seedUser';
import { seedBook } from './helpers/seedBook';

import followsModel from '../src/models/follows';
import booksModel from '../src/models/books';

const app = buildApp();

describe('GET /api/users/me/suggestions — auth', () => {
  it('devuelve 401 sin sesión', async () => {
    clearSession();
    const res = await request(app).get('/api/users/me/suggestions');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/users/me/suggestions — segundo grado', () => {
  beforeEach(async () => {
    await seedUser({ uid: 'me', username: 'me_user' });
    await seedUser({ uid: 'friend_a', username: 'friend_a' });
    await seedUser({ uid: 'friend_b', username: 'friend_b' });
    await seedUser({ uid: 'popular', username: 'popular' });
    await seedUser({ uid: 'niche', username: 'niche' });
    // Sigo a friend_a y friend_b.
    await followsModel.create({ follower: 'me', following: 'friend_a' });
    await followsModel.create({ follower: 'me', following: 'friend_b' });
    // Mis dos seguidos siguen a `popular`; sólo uno sigue a `niche`.
    await followsModel.create({ follower: 'friend_a', following: 'popular' });
    await followsModel.create({ follower: 'friend_b', following: 'popular' });
    await followsModel.create({ follower: 'friend_a', following: 'niche' });
  });

  it('ordena por cantidad de seguidos en común', async () => {
    const cookie = mockSession({ uid: 'me' });

    const res = await request(app).get('/api/users/me/suggestions?limit=5').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const uids = res.body.suggestions.map((u: any) => u.uid);
    expect(uids.indexOf('popular')).toBeLessThan(uids.indexOf('niche'));
  });

  it('excluye al propio usuario y a quienes ya sigue', async () => {
    const cookie = mockSession({ uid: 'me' });

    const res = await request(app).get('/api/users/me/suggestions?limit=5').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const uids = res.body.suggestions.map((u: any) => u.uid);
    expect(uids).not.toContain('me');
    expect(uids).not.toContain('friend_a');
    expect(uids).not.toContain('friend_b');
  });

  it('respeta el limit', async () => {
    const cookie = mockSession({ uid: 'me' });

    const res = await request(app).get('/api/users/me/suggestions?limit=1').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.suggestions).toHaveLength(1);
    expect(res.body.suggestions[0].uid).toBe('popular');
  });
});

describe('GET /api/users/me/suggestions — fallback', () => {
  it('completa con quienes más libros publicaron cuando no hay segundo grado', async () => {
    await seedUser({ uid: 'me', username: 'me_user' });
    await seedUser({ uid: 'writer', username: 'writer' });
    await seedUser({ uid: 'lurker', username: 'lurker' });
    await seedBook({ userId: 'writer', pathUrl: 'w1' });
    await seedBook({ userId: 'writer', pathUrl: 'w2' });

    const cookie = mockSession({ uid: 'me' });

    // `me` no sigue a nadie, así que no hay segundo grado posible.
    const res = await request(app).get('/api/users/me/suggestions?limit=3').set('Cookie', cookie);

    expect(res.status).toBe(200);
    const uids = res.body.suggestions.map((u: any) => u.uid);
    expect(uids).toContain('writer');
    expect(uids).not.toContain('me');
  });
});

describe('GET /api/users/me/suggestions — datos sucios y comunidad chica', () => {
  it('ignora los libros sin userId y no gasta cupo con ellos', async () => {
    await seedUser({ uid: 'me', username: 'me_user' });
    await seedUser({ uid: 'writer', username: 'writer' });
    await seedBook({ userId: 'writer', pathUrl: 'w1' });
    // Libros viejos, anteriores a que `userId` existiera: agrupan bajo null y
    // sumaban más que cualquier autor real.
    await booksModel.collection.insertMany([
      { title: 'legacy 1', pathUrl: 'legacy-1' },
      { title: 'legacy 2', pathUrl: 'legacy-2' },
      { title: 'legacy 3', pathUrl: 'legacy-3' },
    ]);

    const cookie = mockSession({ uid: 'me' });

    const res = await request(app).get('/api/users/me/suggestions?limit=1').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.suggestions).toHaveLength(1);
    expect(res.body.suggestions[0].uid).toBe('writer');
  });

  it('sugiere usuarios que todavía no publicaron ningún libro', async () => {
    await seedUser({ uid: 'me', username: 'me_user' });
    await seedUser({ uid: 'newbie', username: 'newbie' });

    const cookie = mockSession({ uid: 'me' });

    const res = await request(app).get('/api/users/me/suggestions?limit=3').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.suggestions.map((u: any) => u.uid)).toContain('newbie');
  });
});
