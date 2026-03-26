import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { TokenService } from './tokenService';
import { IMFAStrategy } from './mfa/IMFAStrategy';
import { TOTPStrategy } from './mfa/TOTPStrategy';
import { UserRole, TokenPair, UserData } from '../types/jwt';
import {
  AuthenticationError,
  InvalidCredentialsError,
  AccountLockedError,
  MFARequiredError,
  MFAVerificationError,
  MFANotEnabledError,
  TokenExpiredError,
  InvalidTokenError,
  TokenRevokedError,
  TokenReuseDetectedError,
  RateLimitExceededError,
  UserNotFoundError,
  UserAlreadyExistsError,
  InvalidPasswordError,
  InvalidResetTokenError,
  TokenVersionMismatchError
} from '../errors/auth.errors';
import { prisma } from '../lib/prisma';

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserData;
  mfaRequired?: boolean;
  expiresIn?: number;
  refreshExpiresIn?: number;
}

export interface RegisterDTO {
  email: string;
  password: string;
  name: string;
  role: UserRole;
}

export interface LoginDTO {
  email: string;
  password: string;
  mfaCode?: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirm {
  token: string;
  newPassword: string;
}

export interface ChangePasswordDTO {
  oldPassword: string;
  newPassword: string;
}

export interface SSOTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  refreshExpiresIn: number;
}

export class AuthService {
  private tokenService: TokenService;
  private mfaStrategy: IMFAStrategy;
  private readonly saltRounds = 12;
  private readonly maxLoginAttempts = 5;
  private readonly lockoutDurationMinutes = 15;
  private readonly passwordMinLength = 8;
  private readonly passwordResetTokenExpiryHours = 1;

  constructor() {
    this.tokenService = new TokenService();
    this.mfaStrategy = new TOTPStrategy();
  }

  async registerUser(data: RegisterDTO): Promise<UserData> {
    const existingUser = await prisma.users.findUnique({
      where: { email: data.email }
    });

    if (existingUser) {
      throw new UserAlreadyExistsError();
    }

    this.validatePasswordStrength(data.password);

    const passwordHash = await this.hashPassword(data.password);

    const user = await prisma.users.create({
      data: {
        email: data.email,
        password_hash: await this.hashPassword(data.password),
        name: data.name,
        role: data.role,
        is_active: true
      }
    });

    return this.mapToUserData(user);
  }

  async loginUser(data: LoginDTO, ipAddress?: string, userAgent?: string): Promise<LoginResponse> {
    const user = await prisma.users.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      throw new InvalidCredentialsError();
    }

    if (!user.is_active) {
      throw new AuthenticationError('User account is inactive');
    }

    await this.checkRateLimit(user.id, ipAddress);

    const isValidPassword = await this.comparePassword(data.password, user.password_hash);

    if (!isValidPassword) {
      await this.recordFailedAttempt(user.id, ipAddress);
      throw new InvalidCredentialsError();
    }

    if (user.locked_until && user.locked_until > new Date()) {
      throw new AccountLockedError();
    }

    if (user.mfa_enabled && !data.mfaCode) {
      throw new MFARequiredError();
    }

    if (user.mfa_enabled && data.mfaCode) {
      if (!user.mfa_secret) {
        throw new MFANotEnabledError();
      }

      const result = await this.mfaStrategy.verifyCode(user.id, data.mfaCode, user.mfa_secret);

      if (!result.valid) {
        await this.recordFailedAttempt(user.id, ipAddress);
        throw new MFAVerificationError();
      }
    }

    await this.recordSuccessfulAttempt(user.id);

    const userData = this.mapToUserData(user);
    const tokenPair = await this.generateTokenPair(userData, ipAddress, userAgent);

    return {
      ...tokenPair,
      user: userData
    };
  }

  async logoutUser(userId: string, refreshToken: string): Promise<void> {
    const tokenHash = this.hashToken(refreshToken);

    await prisma.refreshTokens.updateMany({
      where: {
        user_id: userId,
        token_hash: tokenHash,
        is_revoked: false
      },
      data: {
        is_revoked: true,
        revoked_at: new Date()
      }
    });

    await prisma.users.update({
      where: { id: userId },
      data: { token_version: { increment: 1 } }
    });
  }

  async logoutAllUserSessions(userId: string): Promise<void> {
    await prisma.users.update({
      where: { id: userId },
      data: { token_version: { increment: 1 } }
    });

    await prisma.refreshTokens.updateMany({
      where: { user_id: userId, is_revoked: false },
      data: { is_revoked: true, revoked_at: new Date() }
    });
  }

  async refreshAccessToken(refreshToken: string, ipAddress?: string, userAgent?: string): Promise<TokenPair> {
    const decoded = this.tokenService.decodeToken(refreshToken);

    if (!decoded || decoded.type !== 'refresh' || !decoded.sub) {
      throw new InvalidTokenError();
    }

    const user = await prisma.users.findUnique({
      where: { id: decoded.sub }
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    if (!user.is_active) {
      throw new AuthenticationError('User account is inactive');
    }

    let payload;

    try {
      payload = this.tokenService.verifyRefreshToken(refreshToken, user.token_version);
    } catch (error) {
      if (error instanceof TokenExpiredError || error instanceof TokenVersionMismatchError) {
        throw error;
      }
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.NotBeforeError) {
        throw new TokenExpiredError('Refresh token has expired');
      }
      throw new InvalidTokenError();
    }

    const tokenHash = this.hashToken(refreshToken);

    const storedToken = await prisma.refreshTokens.findUnique({
      where: { token_hash: tokenHash }
    });

    if (!storedToken) {
      throw new InvalidTokenError();
    }

    if (storedToken.is_revoked) {
      throw new TokenRevokedError();
    }

    if (storedToken.expires_at < new Date()) {
      throw new TokenExpiredError();
    }

    const familyTokens = await prisma.refreshTokens.findMany({
      where: {
        family_id: storedToken.family_id,
        is_revoked: false
      }
    });

    if (familyTokens.length > 1) {
      const tokenIssuedAt = new Date(payload.iat * 1000);
      const isOldest = familyTokens.every((t: any) => t.issued_at >= tokenIssuedAt);

      if (!isOldest) {
        await this.revokeTokenFamily(storedToken.family_id);
        throw new TokenReuseDetectedError();
      }
    }

    await this.revokeRefreshToken(storedToken.id);

    const userData = this.mapToUserData(user);
    return this.generateTokenPair(userData, ipAddress, userAgent, storedToken.family_id, storedToken.id);
  }

  async changePassword(userId: string, data: ChangePasswordDTO): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    const isValidPassword = await this.comparePassword(data.oldPassword, user.password_hash);

    if (!isValidPassword) {
      throw new InvalidCredentialsError();
    }

    this.validatePasswordStrength(data.newPassword);

    const newPasswordHash = await this.hashPassword(data.newPassword);

    await prisma.users.update({
      where: { id: userId },
      data: {
        password_hash: newPasswordHash,
        token_version: { increment: 1 }
      }
    });

    await this.logoutAllUserSessions(userId);
  }

  async resetPasswordRequest(data: PasswordResetRequest): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { email: data.email }
    });

    if (!user) {
      return;
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(resetToken);
    const expiresAt = new Date(Date.now() + this.passwordResetTokenExpiryHours * 60 * 60 * 1000);

    await prisma.passwordResetTokens.create({
      data: {
        user_id: user.id,
        token_hash: tokenHash,
        expires_at: expiresAt
      }
    });
  }

  async resetPasswordConfirm(data: PasswordResetConfirm): Promise<void> {
    const tokenHash = this.hashToken(data.token);

    const resetToken = await prisma.passwordResetTokens.findUnique({
      where: { token_hash: tokenHash }
    });

    if (!resetToken || resetToken.expires_at < new Date() || resetToken.used_at) {
      throw new InvalidResetTokenError();
    }

    this.validatePasswordStrength(data.newPassword);

    const newPasswordHash = await this.hashPassword(data.newPassword);

    await prisma.$transaction([
      prisma.users.update({
        where: { id: resetToken.user_id },
        data: {
          password_hash: newPasswordHash,
          token_version: { increment: 1 },
          login_attempts: 0,
          locked_until: null
        }
      }),
      prisma.passwordResetTokens.update({
        where: { id: resetToken.id },
        data: { used_at: new Date() }
      }),
      prisma.refreshTokens.updateMany({
        where: { user_id: resetToken.user_id },
        data: { is_revoked: true, revoked_at: new Date() }
      })
    ]);
  }

  async enableMFA(userId: string, userName: string): Promise<{ secret: string; qrCodeUrl: string; backupCodes: string[] }> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    const mfaSetup = await this.mfaStrategy.generateSecret(userId, userName);

    return mfaSetup;
  }

  async verifyMFAAndEnable(userId: string, code: string, secret: string, backupCodes: string[]): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    const result = await this.mfaStrategy.verifyCode(userId, code, secret);

    if (!result.valid) {
      throw new MFAVerificationError();
    }

    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => this.hashPassword(code))
    );

    await prisma.users.update({
      where: { id: userId },
      data: {
        mfa_secret: secret,
        mfa_enabled: true,
        mfa_backup_codes: JSON.stringify(hashedBackupCodes),
        token_version: { increment: 1 }
      }
    });

    await this.logoutAllUserSessions(userId);
  }

  async disableMFA(userId: string, password: string): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    const isValidPassword = await this.comparePassword(password, user.password_hash);

    if (!isValidPassword) {
      throw new InvalidCredentialsError();
    }

    await prisma.users.update({
      where: { id: userId },
      data: {
        mfa_secret: null,
        mfa_enabled: false,
        mfa_backup_codes: null,
        token_version: { increment: 1 }
      }
    });

    await this.logoutAllUserSessions(userId);
  }



  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private async generateTokenPair(
    userData: UserData,
    ipAddress?: string,
    userAgent?: string,
    existingFamilyId?: string,
    replacedBy?: string
  ): Promise<TokenPair> {
    const tokenPair = this.tokenService.generateTokenPair(userData);

    const familyId = existingFamilyId || crypto.randomUUID();
    const tokenHash = this.hashToken(tokenPair.refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.refreshTokens.create({
      data: {
        user_id: userData.id,
        token_hash: tokenHash,
        family_id: familyId,
        ip_address: ipAddress,
        user_agent: userAgent,
        expires_at: expiresAt,
        replaced_by_id: replacedBy
      }
    });

    return tokenPair;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private async revokeRefreshToken(tokenId: string): Promise<void> {
    await prisma.refreshTokens.update({
      where: { id: tokenId },
      data: {
        is_revoked: true,
        revoked_at: new Date()
      }
    });
  }

  private async revokeTokenFamily(familyId: string): Promise<void> {
    await prisma.refreshTokens.updateMany({
      where: { family_id: familyId, is_revoked: false },
      data: {
        is_revoked: true,
        revoked_at: new Date()
      }
    });
  }

  private async recordFailedAttempt(userId: string, ipAddress?: string): Promise<void> {
    try {
      const user = await prisma.users.findUnique({
        where: { id: userId }
      });

      if (!user) return;

      const newAttempts = (user.login_attempts || 0) + 1;

      const updateData: any = { login_attempts: newAttempts };

      if (newAttempts >= this.maxLoginAttempts) {
        updateData.locked_until = new Date(Date.now() + this.lockoutDurationMinutes * 60 * 1000);
      }

      await prisma.users.update({
        where: { id: userId },
        data: updateData
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        return;
      }
      throw error;
    }
  }

  private async recordSuccessfulAttempt(userId: string): Promise<void> {
    try {
      await prisma.users.update({
        where: { id: userId },
        data: {
          login_attempts: 0,
          locked_until: null
        }
      });
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        return;
      }
      throw error;
    }
  }

  private async checkRateLimit(userId: string, ipAddress?: string): Promise<void> {
    const user = await prisma.users.findUnique({
      where: { id: userId }
    });

    if (!user) return;

    if (user.locked_until && user.locked_until > new Date()) {
      const remainingMinutes = Math.ceil((user.locked_until.getTime() - Date.now()) / 60000);
      throw new AccountLockedError(`Account is locked. Try again in ${remainingMinutes} minutes`);
    }

    try {
      if (user.login_attempts >= this.maxLoginAttempts) {
        await prisma.users.update({
          where: { id: userId },
          data: {
            locked_until: new Date(Date.now() + this.lockoutDurationMinutes * 60 * 1000)
          }
        });

        throw new RateLimitExceededError();
      }
    } catch (error) {
      if (error instanceof PrismaClientKnownRequestError && error.code === 'P2025') {
        return;
      }
      throw error;
    }
  }

  validatePasswordStrength(password: string): void {
    if (password.length < this.passwordMinLength) {
      throw new InvalidPasswordError(`Password must be at least ${this.passwordMinLength} characters long`);
    }

    if (!/[a-z]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one lowercase letter');
    }

    if (!/[A-Z]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one uppercase letter');
    }

    if (!/[0-9]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one number');
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      throw new InvalidPasswordError('Password must contain at least one special character');
    }
  }

  private mapToUserData(user: any): UserData {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as UserRole,
      is_active: user.is_active,
      tokenVersion: user.token_version,
      mfa_enabled: user.mfa_enabled
    };
  }
}
