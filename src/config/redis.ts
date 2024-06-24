import Redis from 'ioredis';

import { REDIS_HOST, REDIS_PORT, REDIS_PASS } from './env';

export const redis = new Redis({
  host: REDIS_HOST,
  port: parseInt(REDIS_PORT as string),
  password: REDIS_PASS,
});
