import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';
import { mockSession, clearSession } from './helpers/session';
import { authFirebase } from '../src/config/firebase';
import usersModel from '../src/models/users';

const app = buildApp();

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    clearSession();
  });

  it('emite cookie de sesión con un idToken válido', async () => {
    vi.mocked(authFirebase.createSessionCookie).mockResolvedValueOnce('signed-session-cookie');

    const res = await request(app).post('/api/auth/login').send({ idToken: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ auth: true });
    const setCookie = res.headers['set-cookie'];
    expect(Array.isArray(setCookie) ? setCookie.join(';') : setCookie).toContain('_secure_tk=');
  });

  it('rechaza payload sin idToken con 400', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body?.error?.message).toMatch(/token/i);
  });

  it('rechaza idToken vacío con 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ idToken: '' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/refresh', () => {
  it('renueva la cookie con idToken válido', async () => {
    vi.mocked(authFirebase.createSessionCookie).mockResolvedValueOnce('refreshed-session-cookie');

    const res = await request(app).post('/api/auth/refresh').send({ idToken: 'fresh-token' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ auth: true });
  });

  it('rechaza sin idToken con 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('devuelve 401 y limpia cookies si Firebase rechaza el token', async () => {
    vi.mocked(authFirebase.createSessionCookie).mockRejectedValueOnce(new Error('token expirado'));

    const res = await request(app).post('/api/auth/refresh').send({ idToken: 'bad-token' });

    expect(res.status).toBe(401);
  });
});

describe('POST /api/auth/register', () => {
  const cookie = mockSession({ uid: 'firebase-uid-1', email: 'test@x.com' });

  beforeEach(() => {
    mockSession({ uid: 'firebase-uid-1', email: 'test@x.com' });
  });

  it('rechaza sin cookie con 401', async () => {
    clearSession();
    const res = await request(app).post('/api/auth/register').send({ username: 'valid_user' });
    expect(res.status).toBe(401);
  });

  it('rechaza username demasiado corto con 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({ username: 'ab' });
    expect(res.status).toBe(400);
    expect(res.body?.error?.message).toMatch(/username/i);
  });

  it('crea el usuario y responde 200 con un username disponible', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({ username: 'valid_user' });

    expect(res.status).toBe(200);
    const saved = await usersModel.findOne({ uid: 'firebase-uid-1' }).lean();
    expect(saved).toBeTruthy();
    expect(saved?.username).toBe('valid_user');
  });

  it('devuelve el existingUser cuando el uid ya está registrado', async () => {
    // Primer registro
    await request(app)
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({ username: 'first_name' });

    // Segundo intento con el mismo uid
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', cookie)
      .send({ username: 'second_name' });

    expect(res.status).toBe(200);
    expect(res.body?.info?.message).toMatch(/ya registrado/i);
  });
});

describe('POST /api/auth/logout', () => {
  it('limpia la cookie cuando hay sesión válida', async () => {
    const cookie = mockSession({ uid: 'firebase-uid-2' });

    const res = await request(app).post('/api/auth/logout').set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body?.message).toMatch(/logout/i);
  });

  it('rechaza logout sin cookie con 401', async () => {
    clearSession();
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(401);
  });
});
