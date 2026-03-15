import { PrismaClient, Prisma } from '@prisma/client';

let testPrismaClient: PrismaClient | null = null;

export function getTestPrismaClient(): PrismaClient {
  if (!testPrismaClient) {
    const basePrisma = new PrismaClient();
    testPrismaClient = basePrisma.$extends({
      query: {
        $allModels: {
          async $allOperations({ args, query }) {
            return query(args);
          }
        }
      }
    }).$extends({
      name: 'bypass-soft-delete-protection',
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            return query(args);
          }
        }
      }
    }) as PrismaClient;
  }
  return testPrismaClient!;
}

export async function cleanupTestPrisma() {
  if (testPrismaClient) {
    await testPrismaClient.$disconnect();
    testPrismaClient = null;
  }
}
