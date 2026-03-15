import { IMFAStrategy, MFASetupResponse, MFAVerifyResponse } from './IMFAStrategy';
import * as crypto from 'crypto';
import { encode as base32Encode, decode as base32Decode } from 'thirty-two';

export class TOTPStrategy implements IMFAStrategy {
  private readonly secretLength = 32;
  private readonly backupCodesCount = 10;
  private readonly digits = 6;
  private readonly period = 30;
  private readonly window = 1;
  private readonly issuer = 'CentroTex';

  async generateSecret(userId: string, userName: string): Promise<MFASetupResponse> {
    const secret = this.generateRandomSecret();
    const backupCodes = await this.generateBackupCodes();

    const otpauthUrl = this.generateOTPAuthUrl(secret, userName);
    const qrCodeUrl = await this.generateQRCodeUrl(otpauthUrl);

    return {
      secret,
      qrCodeUrl,
      backupCodes
    };
  }

  async verifyCode(userId: string, code: string, secret: string): Promise<MFAVerifyResponse> {
    const isValid = this.verifyTOTP(code, secret);
    
    return {
      valid: isValid,
      remainingAttempts: isValid ? undefined : 3
    };
  }

  async generateBackupCodes(): Promise<string[]> {
    const codes: string[] = [];
    for (let i = 0; i < this.backupCodesCount; i++) {
      const code = this.generateRandomSecret().substring(0, 8).toUpperCase();
      codes.push(code);
    }
    return codes;
  }

  async verifyBackupCode(userId: string, code: string, backupCodes: string[]): Promise<{ valid: boolean; remainingCodes: string[] }> {
    const codeIndex = backupCodes.findIndex(c => c === code.toUpperCase());
    
    if (codeIndex === -1) {
      return { valid: false, remainingCodes: backupCodes };
    }

    const remainingCodes = backupCodes.filter((_, index) => index !== codeIndex);
    return { valid: true, remainingCodes };
  }

  private generateRandomSecret(): string {
    const buffer = crypto.randomBytes(this.secretLength);
    return base32Encode(buffer).toString('ascii').replace(/=/g, '');
  }

  private generateOTPAuthUrl(secret: string, userName: string): string {
    const encodedIssuer = encodeURIComponent(this.issuer);
    const encodedName = encodeURIComponent(userName);
    return `otpauth://totp/${encodedIssuer}:${encodedName}?secret=${secret}&issuer=${encodedIssuer}&digits=${this.digits}&period=${this.period}`;
  }

  private generateQRCodeUrl(otpauthUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const encoded = encodeURIComponent(otpauthUrl);
      resolve(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`);
    });
  }

  private verifyTOTP(code: string, secret: string): boolean {
    const decodedSecret = base32Decode(secret);
    const currentTime = Math.floor(Date.now() / 1000);
    const timeStep = Math.floor(currentTime / this.period);

    for (let offset = -this.window; offset <= this.window; offset++) {
      const time = timeStep + offset;
      const hmac = crypto.createHmac('sha1', decodedSecret);
      hmac.update(this.bufferFromNumber(time));
      const hmacResult = hmac.digest();
      const offsetValue = hmacResult[hmacResult.length - 1] & 0x0f;
      const binary =
        ((hmacResult[offsetValue] & 0x7f) << 24) |
        ((hmacResult[offsetValue + 1] & 0xff) << 16) |
        ((hmacResult[offsetValue + 2] & 0xff) << 8) |
        (hmacResult[offsetValue + 3] & 0xff);
      const otp = (binary % Math.pow(10, this.digits)).toString().padStart(this.digits, '0');

      if (otp === code) {
        return true;
      }
    }

    return false;
  }

  private bufferFromNumber(number: number): Buffer {
    const buffer = Buffer.alloc(8);
    for (let i = 7; i >= 0; i--) {
      buffer[i] = number & 0xff;
      number = number >> 8;
    }
    return buffer;
  }
}
