import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/helpers/setup.ts'],
    // Un solo fork para no colisionar entre suites que comparten el
    // mongodb-memory-server o el mock de Redis.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 30_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/scripts/**', 'src/docs/**', 'src/config/**', 'src/server.ts'],
    },
  },
});
