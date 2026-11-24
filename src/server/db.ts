import 'server-only';
import { PrismaClient } from '@prisma/client';

const cache = globalThis as typeof globalThis & { finoraDb?: PrismaClient };

export function getDb() {
  return cache.finoraDb ??= new PrismaClient();
}
