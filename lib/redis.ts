import 'server-only';

import { createClient, type RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL;

let client: RedisClientType | null = null;
let connectPromise: Promise<RedisClientType> | null = null;

const getRedisClient = async () => {
  if (!redisUrl) {
    return null;
  }

  if (client?.isOpen) {
    return client;
  }

  if (!connectPromise) {
    client = createClient({ url: redisUrl });
    client.on('error', (error) => {
      console.error('Redis client error:', error);
    });
    connectPromise = client.connect().then(() => client as RedisClientType);
  }

  return connectPromise;
};

export const redisGetJson = async <T>(key: string): Promise<T | null> => {
  const redis = await getRedisClient();
  if (!redis) {
    return null;
  }

  const value = await redis.get(key);
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse Redis JSON value, clearing key:', key);
    await redis.del(key);
    return null;
  }
};

export const redisSetJson = async <T>(
  key: string,
  value: T,
  ttlSeconds?: number
) => {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  const payload = JSON.stringify(value);
  if (ttlSeconds) {
    await redis.set(key, payload, { EX: ttlSeconds });
    return;
  }

  await redis.set(key, payload);
};

export const redisDeleteByPrefix = async (prefix: string) => {
  const redis = await getRedisClient();
  if (!redis) {
    return;
  }

  const keys: string[] = [];
  for await (const key of redis.scanIterator({ MATCH: `${prefix}*` })) {
    if (Array.isArray(key)) {
      keys.push(...key);
      continue;
    }

    keys.push(key);
  }

  if (keys.length > 0) {
    await redis.del(keys);
  }
};
