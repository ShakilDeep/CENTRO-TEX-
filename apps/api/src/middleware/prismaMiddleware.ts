import { PrismaClient, Prisma } from '@prisma/client';
import { SoftDeleteProhibitedError } from '../errors/prisma.errors';

const PROTECTED_MODELS = ['Samples', 'Inventory', 'Approvals', 'Audit_Logs'] as const;

const PROTECTED_OPERATIONS = ['delete', 'deleteMany'] as const;

export function createSoftDeleteProtectionExtension() {
  return Prisma.defineExtension({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (PROTECTED_MODELS.includes(model as any) && PROTECTED_OPERATIONS.includes(operation as any)) {
            throw new SoftDeleteProhibitedError(
              `Hard delete operation '${operation}' is prohibited on model '${model}'. Use soft delete instead to maintain audit trail.`
            );
          }

          return query(args);
        }
      }
    }
  });
}

export function createSoftDeleteProtectedPrismaClient(prismaClient: PrismaClient) {
  return prismaClient.$extends(createSoftDeleteProtectionExtension());
}
