import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import RedisMock from 'ioredis-mock';

// Instancia única de Redis mock — la reutilizamos entre tests y la
// exponemos para flushearla en el beforeEach global.
const redisMock = new RedisMock();

// Fijamos el entorno en modo test antes de que cualquier módulo evalúe
// `process.env.NODE_ENV` en tiempo de import.
process.env.NODE_ENV = 'test';
process.env.CLOUDINARY_FOLDER = process.env.CLOUDINARY_FOLDER ?? 'xbu_test';
process.env.MONGODB_URI = 'mongodb://placeholder-set-per-test/';

// Mock global de Redis: cache + rate limit funcionan contra ioredis-mock en
// memoria, sin necesidad de un Redis real durante los tests.
vi.mock('../../src/config/redis', () => ({
  redis: redisMock,
}));

// Mock de Firebase Admin: evita que los tests intenten hablar con Firebase
// real. Los tests que necesiten simular sesión inyectan `req.user` con un
// middleware custom en la suite correspondiente.
vi.mock('../../src/config/firebase', () => ({
  authFirebase: {
    verifySessionCookie: vi.fn().mockRejectedValue(new Error('not mocked')),
    verifyIdToken: vi.fn().mockRejectedValue(new Error('not mocked')),
    createSessionCookie: vi.fn().mockResolvedValue('mocked-session'),
    revokeRefreshTokens: vi.fn().mockResolvedValue(undefined),
    deleteUser: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock de Cloudinary: uploads devuelven un objeto ficticio y destroys son
// no-op. Ningún test debería hablar con Cloudinary real.
vi.mock('../../src/config/cloudinary', () => ({
  cloudinary: {
    uploader: {
      upload_stream: (_opts: unknown, cb: (err: null, res: unknown) => void) => ({
        end: () =>
          cb(null, {
            secure_url: 'https://mock.cloudinary/test.webp',
            public_id: 'mock/test',
          }),
      }),
      destroy: vi.fn().mockResolvedValue({ result: 'ok' }),
    },
    url: () => 'https://mock.cloudinary/signed',
    utils: { private_download_url: () => 'https://mock.cloudinary/private' },
  },
}));

// Mock de Resend: el envío de mail de reportes es no-op.
vi.mock('../../src/config/resend', () => ({
  resend: {
    emails: { send: vi.fn().mockResolvedValue({ id: 'mock-mail' }) },
  },
}));

let memoryServer: MongoMemoryServer | undefined;

beforeAll(async () => {
  memoryServer = await MongoMemoryServer.create();
  const uri = memoryServer.getUri();
  await mongoose.connect(uri);
});

beforeEach(async () => {
  // Limpia todas las colecciones y la cache Redis antes de cada test para
  // aislamiento total. Sin flushear Redis, respuestas cacheadas del test
  // anterior filtran cursors/ids inexistentes al siguiente.
  const collections = mongoose.connection.collections;
  await Promise.all(Object.values(collections).map((col) => col.deleteMany({})));
  await redisMock.flushall();
});

afterAll(async () => {
  await mongoose.disconnect();
  await memoryServer?.stop();
});
