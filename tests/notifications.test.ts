import { describe, expect, it, beforeEach } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession } from './helpers/session';
import notificationsModel from '../src/models/notifications';

const app = buildApp();

async function seedNotifications(
  userId: string,
  count: number,
  extras: Partial<Record<string, unknown>> = {}
) {
  const docs = [];
  for (let i = 0; i < count; i++) {
    docs.push({
      userId,
      type: 'comment',
      actorId: `actor-${i}`,
      bookId: `book-${i}`,
      read: false,
      ...extras,
    });
  }
  await notificationsModel.insertMany(docs);
}

describe('GET /api/notifications', () => {
  it('lista solo notificaciones del usuario autenticado', async () => {
    const cookie = mockSession({ uid: 'user-n1' });
    await seedNotifications('user-n1', 3);
    await seedNotifications('another-user', 2);

    const res = await request(app).get('/api/notifications').set('Cookie', cookie);
    expect(res.status).toBe(200);
    // El shape enriquecido no devuelve userId — solo id/type/actor/book/etc.
    // Confirmamos por count: 3 del user actual, 0 del otro se filtran.
    expect(res.body.notifications).toHaveLength(3);
  });

  it('modo page: devuelve totalPages y currentPage', async () => {
    const cookie = mockSession({ uid: 'user-n2' });
    await seedNotifications('user-n2', 12);

    const res = await request(app).get('/api/notifications?page=1&limit=5').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.notifications).toHaveLength(5);
    expect(res.body.info.total).toBe(12);
    expect(res.body.info.totalPages).toBe(3);
    expect(res.body.info.currentPage).toBe(1);
  });
});

describe('GET /api/notifications/unread-count', () => {
  it('cuenta solo las no leídas del usuario', async () => {
    const cookie = mockSession({ uid: 'user-c1' });
    await seedNotifications('user-c1', 3, { read: false });
    await seedNotifications('user-c1', 2, { read: true });

    const res = await request(app).get('/api/notifications/unread-count').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
  });
});

describe('PATCH /api/notifications/:id/read', () => {
  it('marca una notificación como leída', async () => {
    const cookie = mockSession({ uid: 'user-m1' });
    const notif = await notificationsModel.create({
      userId: 'user-m1',
      type: 'comment',
      actorId: 'actor',
      bookId: 'b',
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    const after = await notificationsModel.findById(notif._id).lean();
    expect(after?.read).toBe(true);
  });

  it('devuelve 404 si la notificación pertenece a otro usuario', async () => {
    const cookie = mockSession({ uid: 'user-m2' });
    const notif = await notificationsModel.create({
      userId: 'other-user',
      type: 'comment',
      actorId: 'actor',
      bookId: 'b',
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/read`)
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/notifications/:id/status', () => {
  it('toggle a no-leída con body read=false', async () => {
    const cookie = mockSession({ uid: 'user-s1' });
    const notif = await notificationsModel.create({
      userId: 'user-s1',
      type: 'comment',
      actorId: 'actor',
      bookId: 'b',
      read: true,
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/status`)
      .set('Cookie', cookie)
      .send({ read: false });
    expect(res.status).toBe(200);
    const after = await notificationsModel.findById(notif._id).lean();
    expect(after?.read).toBe(false);
  });

  it('rechaza payload sin campo `read` con 400', async () => {
    const cookie = mockSession({ uid: 'user-s2' });
    const notif = await notificationsModel.create({
      userId: 'user-s2',
      type: 'comment',
      actorId: 'actor',
      bookId: 'b',
    });

    const res = await request(app)
      .patch(`/api/notifications/${notif._id}/status`)
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/notifications/mark-all-read', () => {
  it('marca todas las del usuario como leídas', async () => {
    const cookie = mockSession({ uid: 'user-a1' });
    await seedNotifications('user-a1', 4, { read: false });
    await seedNotifications('user-a2', 2, { read: false });

    const res = await request(app).patch('/api/notifications/mark-all-read').set('Cookie', cookie);
    expect(res.status).toBe(200);

    const mine = await notificationsModel.find({ userId: 'user-a1' }).lean();
    expect(mine.every((n) => n.read === true)).toBe(true);
    const others = await notificationsModel.find({ userId: 'user-a2' }).lean();
    expect(others.every((n) => n.read === false)).toBe(true);
  });
});

describe('DELETE /api/notifications/:id', () => {
  it('borra una notificación propia', async () => {
    const cookie = mockSession({ uid: 'user-del1' });
    const notif = await notificationsModel.create({
      userId: 'user-del1',
      type: 'comment',
      actorId: 'actor',
      bookId: 'b',
    });

    const res = await request(app).delete(`/api/notifications/${notif._id}`).set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(await notificationsModel.findById(notif._id).lean()).toBeNull();
  });

  it('no puede borrar una ajena — 404', async () => {
    const cookie = mockSession({ uid: 'user-del2' });
    const notif = await notificationsModel.create({
      userId: 'someone-else',
      type: 'comment',
      actorId: 'actor',
      bookId: 'b',
    });

    const res = await request(app).delete(`/api/notifications/${notif._id}`).set('Cookie', cookie);
    expect(res.status).toBe(404);
    expect(await notificationsModel.findById(notif._id).lean()).not.toBeNull();
  });
});
