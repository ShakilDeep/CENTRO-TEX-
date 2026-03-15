import fp from 'fastify-plugin';
import jwt, { FastifyJWTOptions } from '@fastify/jwt';
import { FastifyInstance, FastifyRequest } from 'fastify';
import { TokenService } from '../services/tokenService';
import { UserData, TokenPair, AccessJwtPayload } from '../types/jwt';
import {
  authenticate,
  authenticateOptional,
  authorize,
  requireAdmin,
  requireDispatchOrAdmin,
  requireMerchandiserOrAdmin,
  logAuthOperation,
  getTokenHash
} from '../middleware/auth';

declare module 'fastify' {
  interface FastifyInstance {
    tokenService: TokenService;
    generateAccessToken(user: UserData): string;
    generateRefreshToken(user: UserData): string;
    generateTokenPair(user: UserData): TokenPair;
    verifyAccessToken(token: string): any;
    verifyRefreshToken(token: string, tokenVersion: number): any;
    decodeToken(token: string): any | null;
    getTokenRemainingTime(token: string): number | null;
    isTokenExpiringSoon(token: string, seconds?: number): boolean;
    authenticate(request: FastifyRequest, reply: any): Promise<void>;
    authenticateOptional(request: FastifyRequest, reply: any): Promise<void>;
    authorize(roles: string[]): (request: FastifyRequest, reply: any) => Promise<void>;
    requireAdmin(request: FastifyRequest, reply: any): Promise<void>;
    requireDispatchOrAdmin(request: FastifyRequest, reply: any): Promise<void>;
    requireMerchandiserOrAdmin(request: FastifyRequest, reply: any): Promise<void>;
  }
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    user?: AccessJwtPayload;
    payload: AccessJwtPayload;
  }
}

export default fp(async function jwtPlugin(fastify: FastifyInstance) {
  const tokenService = new TokenService();
  fastify.decorate('tokenService', tokenService);

  fastify.register(jwt as any, {
    secret: process.env.JWT_SECRET || 'dev-secret-key',
    sign: {
      expiresIn: process.env.JWT_ACCESS_EXPIRY || '1h',
      issuer: process.env.JWT_ISSUER || 'centrotex-api',
      audience: process.env.JWT_AUDIENCE || 'centrotex-web'
    },
    verify: {
      issuer: process.env.JWT_ISSUER || 'centrotex-api',
      audience: process.env.JWT_AUDIENCE || 'centrotex-web',
      algorithms: ['HS256', 'RS256']
    },
    cookie: {
      cookieName: 'refreshToken',
      signed: false
    },
    messages: {
      badRequestErrorMessage: 'Format is Authorization: Bearer [token]',
      noAuthorizationInHeaderMessage: 'Missing Authorization header',
      authorizationTokenExpiredMessage: 'Authorization token expired',
      authorizationTokenInvalid: (err: Error) => {
        return `Authorization token is invalid: ${err.message}`;
      }
    }
  });

  fastify.decorate('generateAccessToken', (user: UserData): string => {
    const token = tokenService.generateAccessToken(user);
    logAuthOperation('token_generation', user.id, user.email, true);
    return token;
  });

  fastify.decorate('generateRefreshToken', (user: UserData): string => {
    const token = tokenService.generateRefreshToken(user);
    logAuthOperation('refresh_token_generation', user.id, user.email, true);
    return token;
  });

  fastify.decorate('generateTokenPair', (user: UserData): TokenPair => {
    const tokenPair = tokenService.generateTokenPair(user);
    logAuthOperation('token_pair_generation', user.id, user.email, true);
    return tokenPair;
  });

  fastify.decorate('verifyAccessToken', (token: string): any => {
    try {
      const payload = tokenService.verifyAccessToken(token);
      logAuthOperation('access_token_verification', payload.sub, payload.email, true);
      return payload;
    } catch (error) {
      const payload = tokenService.decodeToken(token);
      const email = payload && payload.type === 'access' ? payload.email : undefined;
      logAuthOperation('access_token_verification', payload?.sub || 'unknown', email, false, (error as Error).message);
      throw error;
    }
  });

  fastify.decorate('verifyRefreshToken', (token: string, tokenVersion: number): any => {
    try {
      const payload = tokenService.verifyRefreshToken(token, tokenVersion);
      logAuthOperation('refresh_token_verification', payload.sub, undefined, true);
      return payload;
    } catch (error) {
      const payload = tokenService.decodeToken(token);
      logAuthOperation('refresh_token_verification', payload?.sub || 'unknown', undefined, false, (error as Error).message);
      throw error;
    }
  });

  fastify.decorate('decodeToken', (token: string): any | null => {
    return tokenService.decodeToken(token);
  });

  fastify.decorate('getTokenRemainingTime', (token: string): number | null => {
    return tokenService.getTokenRemainingTime(token);
  });

  fastify.decorate('isTokenExpiringSoon', (token: string, seconds: number = 600): boolean => {
    return tokenService.isTokenExpiringSoon(token, seconds);
  });

  fastify.decorate('authenticate', authenticate);
  fastify.decorate('authenticateOptional', authenticateOptional);
  fastify.decorate('authorize', authorize);
  fastify.decorate('requireAdmin', requireAdmin);
  fastify.decorate('requireDispatchOrAdmin', requireDispatchOrAdmin);
  fastify.decorate('requireMerchandiserOrAdmin', requireMerchandiserOrAdmin);

  fastify.addHook('onRequest', async (request: FastifyRequest, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const remainingTime = tokenService.getTokenRemainingTime(token);

      if (remainingTime !== null && remainingTime <= 600) {
        request.log.warn({
          tokenHash: getTokenHash(token),
          remainingTime,
          message: 'Access token expiring soon'
        });
      }
    }
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply) => {
    const user = request.user as AccessJwtPayload | undefined;
    if (user) {
      reply.header('X-User-ID', user.sub);
      reply.header('X-User-Role', user.role);
    }
  });

  fastify.log.info('JWT plugin registered successfully');
}, {
  name: 'jwt-plugin',
  dependencies: []
});
