import { describe, expect, it } from 'vitest';
import request from 'supertest';

import { buildApp } from './helpers/buildApp';

describe('smoke', () => {
  const app = buildApp();

  it('GET /health responde 200 con { status: "ok" }', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('GET / responde 200 con la landing HTML', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('XBuReads');
  });

  it('GET /ruta-que-no-existe responde 404 con shape estándar', async () => {
    const res = await request(app).get('/ruta-que-no-existe');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { status: 404, message: 'La ruta solicitada no existe' },
    });
  });
});
