import { redis } from '../config/redis';

/**
 * Service de cache sobre Redis. Encapsula el cliente y agrega:
 * - Failover silencioso: si Redis cae, el caller no falla.
 * - Serialización JSON automática.
 * - TTL atómico (set + EX en una sola call).
 *
 * Pattern principal: `getOrSet(key, fetcher, ttl)` — leer cache;
 * si no está, ejecutar `fetcher`, guardar y devolver.
 */
export const CacheService = {
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const cached = await redis.get(key);
      return cached ? (JSON.parse(cached) as T) : null;
    } catch (err) {
      console.error(`[CacheService] get error for "${key}":`, err);
      return null;
    }
  },

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    try {
      await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch (err) {
      console.error(`[CacheService] set error for "${key}":`, err);
    }
  },

  async del(...keys: string[]): Promise<void> {
    if (keys.length === 0) return;
    try {
      await redis.del(...keys);
    } catch (err) {
      console.error('[CacheService] del error:', err);
    }
  },

  /**
   * Invalida todas las keys que matcheen un patrón (usa SCAN, no KEYS).
   * Útil para invalidar grupos: `invalidatePattern('books:*')`.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const keys: string[] = [];

      for await (const batch of stream) {
        keys.push(...batch);
      }

      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (err) {
      console.error(`[CacheService] invalidatePattern error for "${pattern}":`, err);
    }
  },

  /**
   * Read-through cache: si hay valor en cache lo devuelve;
   * si no, ejecuta `fetcher`, guarda el resultado y lo devuelve.
   * Si Redis falla, ejecuta `fetcher` sin cachear.
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetcher();
    await this.set(key, fresh, ttlSeconds);
    return fresh;
  },
};
