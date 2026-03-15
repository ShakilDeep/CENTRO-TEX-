export interface MFASetupResponse {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface MFAVerifyResponse {
  valid: boolean;
  remainingAttempts?: number;
}

export interface IMFAStrategy {
  generateSecret(userId: string, userName: string): Promise<MFASetupResponse>;
  verifyCode(userId: string, code: string, secret: string): Promise<MFAVerifyResponse>;
  generateBackupCodes(): Promise<string[]>;
  verifyBackupCode(userId: string, code: string, backupCodes: string[]): Promise<{ valid: boolean; remainingCodes: string[] }>;
}
