import { ValidationSchemas } from './validationSchemas';
import { formErrorHandler, qrErrorHandler } from './validationHandler';

export interface ValidationResult {
  success: boolean;
  errors?: Record<string, string>;
  error?: string;
}

export class ValidationFacade {
  static validateLogin(data: unknown): ValidationResult {
    try {
      ValidationSchemas.loginSchema.parse(data);
      return { success: true, errors: {} };
    } catch (error) {
      return { 
        success: false, 
        errors: formErrorHandler.handle(error as any) as Record<string, string> 
      };
    }
  }

  static validateQRCode(code: string, type: 'sample' | 'location'): ValidationResult {
    try {
      const schema = type === 'sample' ? ValidationSchemas.qrSampleIdSchema : ValidationSchemas.qrLocationIdSchema;
      schema.parse(code);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: qrErrorHandler.handle(error as any) as string 
      };
    }
  }

  static validateLocation(data: unknown): ValidationResult {
    try {
      ValidationSchemas.locationSchema.parse(data);
      return { success: true, errors: {} };
    } catch (error) {
      return { 
        success: false, 
        errors: formErrorHandler.handle(error as any) as Record<string, string> 
      };
    }
  }

  static validateSample(data: unknown): ValidationResult {
    try {
      ValidationSchemas.sampleSchema.parse(data);
      return { success: true, errors: {} };
    } catch (error) {
      return { 
        success: false, 
        errors: formErrorHandler.handle(error as any) as Record<string, string> 
      };
    }
  }
}
