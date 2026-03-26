import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AuthService } from '../services/authService';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { AccessJwtPayload } from '../types/jwt';
import {
  InvalidCredentialsError,
  UserNotFoundError,
  AccountLockedError,
  MFARequiredError,
  MFAVerificationError,
  RateLimitExceededError,
  InvalidTokenError
} from '../errors/auth.errors';
import {
  loginSchema,
  logoutSchema,
  refreshTokenSchema
} from '../middleware/validation';

interface LoginBody {
  email: string;
  password: string;
  mfaCode?: string;
}

interface LogoutBody {
  refreshToken: string;
}

interface RefreshTokenBody {
  refreshToken: string;
}



async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  fastify.post<{ Body: LoginBody }>('/login', {
    schema: {
      body: loginSchema
    }
  }, async (request, reply) => {
    const { email, password, mfaCode } = request.body;

    const ipAddress = request.ip;
    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader.join(', ') : userAgentHeader;

    try {
      const result = await authService.loginUser(
        { email, password, mfaCode },
        ipAddress,
        userAgent
      );

      return reply.status(200).send({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          refreshExpiresIn: result.refreshExpiresIn
        }
      });
    } catch (error) {
      if (error instanceof InvalidCredentialsError) {
        return reply.status(401).send({
          success: false,
          error: 'invalid_credentials',
          message: error.message
        });
      }

      if (error instanceof UserNotFoundError) {
        return reply.status(404).send({
          success: false,
          error: 'user_not_found',
          message: error.message
        });
      }

      if (error instanceof AccountLockedError) {
        return reply.status(403).send({
          success: false,
          error: 'account_locked',
          message: error.message
        });
      }

      if (error instanceof MFARequiredError) {
        return reply.status(401).send({
          success: false,
          error: 'mfa_required',
          message: error.message
        });
      }

      if (error instanceof MFAVerificationError) {
        return reply.status(401).send({
          success: false,
          error: 'mfa_verification_failed',
          message: error.message
        });
      }

      if (error instanceof RateLimitExceededError) {
        return reply.status(429).send({
          success: false,
          error: 'rate_limit_exceeded',
          message: error.message
        });
      }

      fastify.log.error(error);
      return reply.status(500).send({
        success: false,
        error: 'internal_server_error',
        message: 'An unexpected error occurred'
      });
    }
  });

  fastify.post<{ Body: LogoutBody }>('/logout', {
    schema: {
      body: logoutSchema
    }
  }, async (request, reply) => {
    const { refreshToken } = request.body;
    let userId;

    // Try to get userId from the authenticated request
    try {
      const token = request.headers.authorization?.replace('Bearer ', '');
      if (token) {
        const decoded = fastify.decodeToken(token);
        if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
          userId = (decoded as { sub: string }).sub;
        }
      }
    } catch {
      // If decoding the auth token fails, try the refresh token
    }

    if (!userId) {
      try {
        const decoded = fastify.decodeToken(refreshToken);
        if (decoded && typeof decoded === 'object' && 'sub' in decoded) {
          userId = (decoded as { sub: string }).sub;
        }
      } catch {
        // Continue without userId if refresh token is invalid
      }
    }

    try {
      if (userId) {
        await authService.logoutUser(userId, refreshToken);
      }

      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully'
      });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(200).send({
        success: true,
        message: 'Logged out successfully'
      });
    }
  });

  fastify.post<{ Body: RefreshTokenBody }>('/refresh', {
    schema: {
      body: refreshTokenSchema
    }
  }, async (request, reply) => {
    const { refreshToken } = request.body;

    const ipAddress = request.ip;
    const userAgentHeader = request.headers['user-agent'];
    const userAgent = Array.isArray(userAgentHeader) ? userAgentHeader.join(', ') : userAgentHeader;

    try {
      const result = await authService.refreshAccessToken(
        refreshToken,
        ipAddress,
        userAgent
      );

      return reply.status(200).send({
        success: true,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          expiresIn: result.expiresIn,
          refreshExpiresIn: result.refreshExpiresIn
        }
      });
    } catch (error) {
      if (error instanceof InvalidTokenError) {
        return reply.status(401).send({
          success: false,
          error: 'invalid_token',
          message: error.message
        });
      }

      fastify.log.error(error);
      return reply.status(401).send({
        success: false,
        error: 'token_refresh_failed',
        message: 'Failed to refresh token'
      });
    }
  });



  // GET /api/v1/auth/users — List all users for Admin panel
  fastify.get('/users', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const users = await prisma.users.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          is_active: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' }
      });

      return reply.status(200).send({ success: true, data: users });
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: 'Failed to fetch users' });
    }
  });

  // POST /api/v1/auth/users — Create a new user for Admin panel
  fastify.post('/users', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { name, email, role, office } = request.body as any;
      const hashedPassword = await authService.hashPassword('password123');
      const user = await prisma.users.create({
        data: {
          name,
          email,
          password_hash: hashedPassword,
          role: role || 'MERCHANDISER',
          is_active: true
        }
      });
      return reply.status(200).send({ success: true, data: user });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ success: false, error: 'Failed to create user', message: error.message });
    }
  });

  // PATCH /api/v1/auth/users/:id — Update or deactivate a user
  fastify.patch('/users/:id', {
    preHandler: [fastify.authenticate, fastify.requireAdmin]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const body = request.body as any;
      const user = await prisma.users.update({
        where: { id },
        data: body
      });
      return reply.status(200).send({ success: true, data: user });
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(400).send({ success: false, error: 'Failed to update user', message: error.message });
    }
  });

}
export default authRoutes;
