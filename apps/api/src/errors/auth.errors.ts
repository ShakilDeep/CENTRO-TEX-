export class AuthenticationError extends Error {
  constructor(message: string, public readonly statusCode: number = 401) {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor(message: string = 'Invalid email or password') {
    super(message, 401);
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class AccountLockedError extends AuthenticationError {
  constructor(message: string = 'Account is locked due to too many failed attempts') {
    super(message, 423);
    this.name = 'AccountLockedError';
    Object.setPrototypeOf(this, AccountLockedError.prototype);
  }
}

export class MFARequiredError extends AuthenticationError {
  constructor(message: string = 'Multi-factor authentication is required') {
    super(message, 403);
    this.name = 'MFARequiredError';
    Object.setPrototypeOf(this, MFARequiredError.prototype);
  }
}

export class MFAVerificationError extends AuthenticationError {
  constructor(message: string = 'Invalid MFA code') {
    super(message, 401);
    this.name = 'MFAVerificationError';
    Object.setPrototypeOf(this, MFAVerificationError.prototype);
  }
}

export class MFANotEnabledError extends AuthenticationError {
  constructor(message: string = 'MFA is not enabled for this account') {
    super(message, 400);
    this.name = 'MFANotEnabledError';
    Object.setPrototypeOf(this, MFANotEnabledError.prototype);
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(message: string = 'Token has expired') {
    super(message, 401);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(message: string = 'Invalid token') {
    super(message, 401);
    this.name = 'InvalidTokenError';
    Object.setPrototypeOf(this, InvalidTokenError.prototype);
  }
}

export class TokenRevokedError extends AuthenticationError {
  constructor(message: string = 'Token has been revoked') {
    super(message, 401);
    this.name = 'TokenRevokedError';
    Object.setPrototypeOf(this, TokenRevokedError.prototype);
  }
}

export class TokenReuseDetectedError extends AuthenticationError {
  constructor(message: string = 'Token reuse detected. All tokens in this family have been revoked') {
    super(message, 401);
    this.name = 'TokenReuseDetectedError';
    Object.setPrototypeOf(this, TokenReuseDetectedError.prototype);
  }
}

export class RateLimitExceededError extends AuthenticationError {
  constructor(message: string = 'Rate limit exceeded. Please try again later') {
    super(message, 429);
    this.name = 'RateLimitExceededError';
    Object.setPrototypeOf(this, RateLimitExceededError.prototype);
  }
}

export class OAuthError extends AuthenticationError {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly originalError?: unknown
  ) {
    super(message, 400);
    this.name = 'OAuthError';
    Object.setPrototypeOf(this, OAuthError.prototype);
  }
}

export class UserNotFoundError extends AuthenticationError {
  constructor(message: string = 'User not found') {
    super(message, 404);
    this.name = 'UserNotFoundError';
    Object.setPrototypeOf(this, UserNotFoundError.prototype);
  }
}

export class UserAlreadyExistsError extends AuthenticationError {
  constructor(message: string = 'User with this email already exists') {
    super(message, 409);
    this.name = 'UserAlreadyExistsError';
    Object.setPrototypeOf(this, UserAlreadyExistsError.prototype);
  }
}

export class InvalidPasswordError extends AuthenticationError {
  constructor(message: string = 'Password does not meet requirements') {
    super(message, 400);
    this.name = 'InvalidPasswordError';
    Object.setPrototypeOf(this, InvalidPasswordError.prototype);
  }
}

export class InvalidResetTokenError extends AuthenticationError {
  constructor(message: string = 'Invalid or expired password reset token') {
    super(message, 400);
    this.name = 'InvalidResetTokenError';
    Object.setPrototypeOf(this, InvalidResetTokenError.prototype);
  }
}

export class TokenVersionMismatchError extends AuthenticationError {
  constructor(message: string = 'Token version mismatch') {
    super(message, 401);
    this.name = 'TokenVersionMismatchError';
    Object.setPrototypeOf(this, TokenVersionMismatchError.prototype);
  }
}

export class TokenTypeError extends AuthenticationError {
  constructor(message: string = 'Invalid token type') {
    super(message, 401);
    this.name = 'TokenTypeError';
    Object.setPrototypeOf(this, TokenTypeError.prototype);
  }
}
