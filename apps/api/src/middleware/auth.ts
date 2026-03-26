import { FastifyRequest, FastifyReply } from 'fastify';
import { UserRole, AccessJwtPayload } from '../types/jwt';

/**
 * JWT authentication middleware.
 * Verifies the access token and attaches decoded payload to request.user.
 */
export const authenticate = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch (err) {
    reply.code(401).send({
      error: 'Unauthorized',
      message: 'Authentication required. Please log in.',
    });
  }
};

/**
 * Optional authentication — does not reject unauthenticated requests,
 * but attaches user data to request.user if a valid token is present.
 */
export const authenticateOptional = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch (_err) {
    // Silently continue — route is accessible without auth
  }
};

/**
 * Role-based authorization middleware factory.
 * Returns a preHandler that checks if the authenticated user holds one
 * of the specified roles.
 */
export const authorize = (allowedRoles: UserRole[]) => {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user as AccessJwtPayload;

    if (!user || !user.role) {
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Access denied. No role assigned.',
      });
      return;
    }

    if (!allowedRoles.includes(user.role as UserRole)) {
      reply.code(403).send({
        error: 'Forbidden',
        message: `Access denied. Required role: ${allowedRoles.join(' or ')}.`,
      });
      return;
    }
  };
};

export const requireAdmin = authorize(['ADMIN']);
export const requireDispatchOrAdmin = authorize(['ADMIN', 'DISPATCH']);
export const requireMerchandiserOrAdmin = authorize(['ADMIN', 'MERCHANDISER']);

/**
 * Structured auth operation logger for security auditing.
 */
export const logAuthOperation = (
  operation: string,
  userId: string,
  email?: string,
  success: boolean = true,
  error?: string,
): void => {
  const logData = {
    level: success ? 'info' : 'error',
    operation,
    userId,
    email,
    success,
    error,
    timestamp: new Date().toISOString(),
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
