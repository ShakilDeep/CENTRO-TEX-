import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
  AccessJwtPayload,
  RefreshJwtPayload,
  JwtPayload,
  UserData,
  TokenPair,
  JwtConfig
} from '../types/jwt';
import {
  TokenExpiredError,
  InvalidTokenError,
  TokenTypeError,
  TokenVersionMismatchError
} from '../errors/auth.errors';

const ACCESS_TOKEN_EXPIRY = 60 * 60;
const REFRESH_TOKEN_EXPIRY = 7 * 24 * 60 * 60;

export class TokenService {
  private config: JwtConfig;

  constructor(config?: Partial<JwtConfig>) {
    this.config = {
      secret: config?.secret || process.env.JWT_SECRET || 'dev-secret-key',
      refreshSecret: config?.refreshSecret || process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key',
      issuer: config?.issuer || process.env.JWT_ISSUER || 'centrotex-api',
      audience: config?.audience || process.env.JWT_AUDIENCE || 'centrotex-web',
      accessExpiry: config?.accessExpiry || process.env.JWT_ACCESS_EXPIRY || '1h',
      refreshExpiry: config?.refreshExpiry || process.env.JWT_REFRESH_EXPIRY || '7d',
      algorithm: config?.algorithm || 'HS256'
    };
  }

  generateAccessToken(user: UserData): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = this.parseExpiry(this.config.accessExpiry);

    const payload: AccessJwtPayload = {
      id: user.id,
      sub: user.id,
      email: user.email,
      role: user.role,
      iat: now,
      exp: now + expiresIn,
      type: 'access',
      iss: this.config.issuer,
      aud: this.config.audience,
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.config.secret, {
      algorithm: this.config.algorithm
    });
  }

  generateRefreshToken(user: UserData): string {
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = this.parseExpiry(this.config.refreshExpiry);

    const payload: RefreshJwtPayload = {
      sub: user.id,
      tokenVersion: user.tokenVersion,
      iat: now,
      exp: now + expiresIn,
      type: 'refresh',
      iss: this.config.issuer,
      aud: this.config.audience,
      jti: crypto.randomUUID()
    };

    return jwt.sign(payload, this.config.refreshSecret, {
      algorithm: this.config.algorithm
    });
  }

  generateTokenPair(user: UserData): TokenPair {
    const accessExpiry = this.parseExpiry(this.config.accessExpiry);
    const refreshExpiry = this.parseExpiry(this.config.refreshExpiry);

    return {
      accessToken: this.generateAccessToken(user),
      refreshToken: this.generateRefreshToken(user),
      expiresIn: accessExpiry,
      refreshExpiresIn: refreshExpiry
    };
  }

  verifyAccessToken(token: string): AccessJwtPayload {
    try {
      const payload = jwt.verify(token, this.config.secret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm]
      }) as JwtPayload;

      if (payload.type !== 'access') {
        throw new TokenTypeError('Expected access token, received ' + payload.type);
      }

      return payload as AccessJwtPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Access token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        const decoded = jwt.decode(token) as JwtPayload | null;
        if (decoded?.type === 'refresh') {
          throw new TokenTypeError('Expected access token, received refresh');
        }
        throw new InvalidTokenError('Invalid access token: ' + error.message);
      }
      throw new InvalidTokenError('Token verification failed');
    }
  }

  verifyRefreshToken(token: string, currentTokenVersion: number): RefreshJwtPayload {
    try {
      const payload = jwt.verify(token, this.config.refreshSecret, {
        issuer: this.config.issuer,
        audience: this.config.audience,
        algorithms: [this.config.algorithm]
      }) as JwtPayload;

      if (payload.type !== 'refresh') {
        throw new TokenTypeError('Expected refresh token, received ' + payload.type);
      }

      const refreshPayload = payload as RefreshJwtPayload;

      if (refreshPayload.tokenVersion !== currentTokenVersion) {
        throw new TokenVersionMismatchError('Token version mismatch');
      }

      return refreshPayload;
    } catch (error) {
      if (error instanceof TokenVersionMismatchError || error instanceof TokenTypeError) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError) {
        throw new TokenExpiredError('Refresh token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        const decoded = jwt.decode(token) as JwtPayload | null;
        if (decoded?.type === 'access') {
          throw new TokenTypeError('Expected refresh token, received access');
        }
        throw new InvalidTokenError('Invalid refresh token: ' + error.message);
      }
      throw new InvalidTokenError('Token verification failed');
    }
  }

  refreshToken(refreshToken: string, user: UserData): TokenPair {
    try {
      const payload = this.verifyRefreshToken(refreshToken, user.tokenVersion);

      return this.generateTokenPair(user);
    } catch (error) {
      throw error;
    }
  }

  decodeToken(token: string): JwtPayload | null {
    try {
      const decoded = jwt.decode(token) as JwtPayload;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  getTokenRemainingTime(token: string): number | null {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return null;
    }

    const now = Math.floor(Date.now() / 1000);
    return Math.max(0, payload.exp - now);
  }

  isTokenExpiringSoon(token: string, seconds: number = 600): boolean {
    const remaining = this.getTokenRemainingTime(token);
    return remaining !== null && remaining <= seconds;
  }

  private parseExpiry(expiry: string): number {
    const match = expiry.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error('Invalid expiry format. Use format like "1h", "30m", "7d"');
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400
    };

    return value * multipliers[unit];
  }

  getConfig(): JwtConfig {
    return { ...this.config };
  }
}
