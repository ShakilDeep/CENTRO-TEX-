export type UserRole = 'ADMIN' | 'MERCHANDISER' | 'DISPATCH';

export interface AccessJwtPayload {
  id: string;
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
  type: 'access';
  iss: string;
  aud: string;
  jti: string;
}

export interface RefreshJwtPayload {
  sub: string;
  tokenVersion: number;
  iat: number;
  exp: number;
  type: 'refresh';
  iss: string;
  aud: string;
  jti: string;
}

export type JwtPayload = AccessJwtPayload | RefreshJwtPayload;

export interface UserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_active: boolean;
  tokenVersion: number;
  mfa_enabled: boolean;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export interface JwtConfig {
  secret: string;
  refreshSecret: string;
  issuer: string;
  audience: string;
  accessExpiry: string;
  refreshExpiry: string;
  algorithm: 'HS256' | 'RS256';
}

export class TokenExpiredError extends Error {
  constructor(message: string = 'Token has expired') {
    super(message);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends Error {
  constructor(message: string = 'Invalid token') {
    super(message);
    this.name = 'InvalidTokenError';
  }
}

export class TokenVersionMismatchError extends Error {
  constructor(message: string = 'Token version mismatch') {
    super(message);
    this.name = 'TokenVersionMismatchError';
  }
}

export class TokenTypeError extends Error {
  constructor(message: string = 'Invalid token type') {
    super(message);
    this.name = 'TokenTypeError';
  }
}
