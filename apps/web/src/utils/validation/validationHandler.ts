import { ZodError } from 'zod';

interface ErrorStrategy {
  formatErrors(error: ZodError): Record<string, string> | string;
}

class FormErrorStrategy implements ErrorStrategy {
  formatErrors(error: ZodError): Record<string, string> {
    const errors: Record<string, string> = {};
    error.issues.forEach((err: any) => {
      const path = err.path.join('.');
      errors[path] = err.message;
    });
    return errors;
  }
}

class QRErrorStrategy implements ErrorStrategy {
  formatErrors(error: ZodError): string {
    return error.issues[0]?.message || "Invalid QR code format";
  }
}

export class ValidationErrorHandler {
  private strategy: ErrorStrategy;

  constructor(strategy: ErrorStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: ErrorStrategy): void {
    this.strategy = strategy;
  }

  handle(error: ZodError): Record<string, string> | string {
    return this.strategy.formatErrors(error);
  }
}

export const formErrorHandler = new ValidationErrorHandler(new FormErrorStrategy());
export const qrErrorHandler = new ValidationErrorHandler(new QRErrorStrategy());
