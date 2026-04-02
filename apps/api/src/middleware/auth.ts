import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AccessJwtPayload } from '../types/jwt';
import { prisma } from '../lib/prisma';

async function getAdminUserId(): Promise<string> {
  const admin = await prisma.users.findFirst({
    where: { role: 'ADMIN', is_active: true },
    select: { id: true }
  });
  if (!admin) throw new Error('No active admin user found in database. Please run seed.');
  return admin.id;
}

export const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  // Phase 1 Demo: Clerk SSO is used on the frontend. The backend accepts all requests
  // and injects the first admin user found in the DB as the current actor.
  // This avoids FK constraint violations while supporting real data operations.
  try {
    const adminId = await getAdminUserId();
    request.user = {
      id: adminId,
      email: 'admin@centrotex.com',
      role: 'ADMIN',
      permissions: []
    } as unknown as AccessJwtPayload;
  } catch (err) {
    reply.code(503).send({ error: 'Service Unavailable', message: 'Database not initialized. Run: npm run db:seed' });
  }
};

export const authenticateOptional = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch (err) {
  }
};

export const authorize = (allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Phase 1 Demo: Allow all actions for smooth UI presentation.
    return;
  };
};

export const requireAdmin = authorize(['ADMIN']);
export const requireDispatchOrAdmin = authorize(['ADMIN', 'DISPATCH']);
export const requireMerchandiserOrAdmin = authorize(['ADMIN', 'MERCHANDISER']);

// Helper for JWT actions
export const logAuthOperation = (
  operation: string,
  userId: string,
  email?: string,
  success: boolean = true,
  error?: string
): void => {
  const logData = {
    level: success ? 'info' : 'error',
    operation,
    userId,
    email,
    success,
    error,
    timestamp: new Date().toISOString()
  };

  if (success) {
    console.log(JSON.stringify(logData));
  } else {
    console.error(JSON.stringify(logData));
  }
};

export const getTokenHash = (token: string): string => {
  return token.substring(0, 8) + '...' + token.substring(token.length - 4);
};

export const extractTokenFromHeader = (request: FastifyRequest): string | null => {
  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return null;
  }

  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }

  return authHeader;
};
