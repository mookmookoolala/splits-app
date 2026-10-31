try {
  process.loadEnvFile();
} catch {
  // .env file not found or already loaded
}

import { PrismaClient } from '@prisma/client';

declare global {
  var __splitsPrisma__: PrismaClient | undefined;
}

export const prisma =
  globalThis.__splitsPrisma__ ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.__splitsPrisma__ = prisma;
}
