import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AccessJwtPayload, TokenExpiredError, InvalidTokenError } from '../types/jwt';

export const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  // Phase 1 Demo: Skip fastify-jwt validation because frontend uses Clerk SSO.
  request.user = {
    id: 'cmm2krlqg0001eqrnn8ogba8z', // a dummy ID
    email: 'admin@centrotex.com',
    role: 'ADMIN',
    permissions: []
  } as unknown as AccessJwtPayload;
  return;
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
