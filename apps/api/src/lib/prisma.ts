import { PrismaClient } from '@prisma/client';
import { createSoftDeleteProtectedPrismaClient } from '../middleware/prismaMiddleware';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const basePrisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
});

export const prisma = createSoftDeleteProtectedPrismaClient(basePrisma);

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = basePrisma;
