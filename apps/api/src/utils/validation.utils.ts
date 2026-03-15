/**
 * Shared validation utilities
 * Eliminates duplicate validation schema definitions using builder pattern
 */

export interface ValidationRuleOptions {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  required?: boolean;
}

/**
 * Validation Schema Builder
 * Implements Builder pattern for creating reusable validation schemas
 */
export class ValidationSchemaBuilder {
  /**
   * Creates a string field schema with common validation rules
   */
  static string(options: ValidationRuleOptions = {}) {
    const schema: any = {
      type: 'string'
    };

    if (options.minLength !== undefined) {
      schema.minLength = options.minLength;
    }

    if (options.maxLength !== undefined) {
      schema.maxLength = options.maxLength;
    }

    if (options.pattern) {
      schema.pattern = options.pattern;
    }

    if (options.enum) {
      schema.enum = options.enum;
    }

    return schema;
  }

  /**
   * Creates an email field schema
   */
  static email(maxLength = 255) {
    return {
      type: 'string',
      format: 'email',
      minLength: 5,
      maxLength
    };
  }

  /**
   * Creates a password field schema
   */
  static password(minLength = 8, maxLength = 128) {
    return {
      type: 'string',
      minLength,
      maxLength
    };
  }

  /**
   * Creates an ID field schema
   */
  static id(maxLength = 255) {
    return {
      type: 'string',
      minLength: 1,
      maxLength
    };
  }

  /**
   * Creates a numeric string field (for pagination, etc.)
   */
  static numericString() {
    return {
      type: 'string',
      pattern: '^\\d+$'
    };
  }

  /**
   * Creates an MFA code field schema
   */
  static mfaCode() {
    return {
      type: 'string',
      minLength: 6,
      maxLength: 6,
      pattern: '^\\d{6}$'
    };
  }

  /**
   * Creates a date-time field schema
   */
  static dateTime() {
    return {
      type: 'string',
      format: 'date-time'
    };
  }

  /**
   * Creates an enum field schema
   */
  static enum(values: string[], defaultValue?: string) {
    const schema: any = {
      type: 'string',
      enum: values
    };

    if (defaultValue) {
      schema.default = defaultValue;
    }

    return schema;
  }

  /**
   * Creates a notes/description field schema
   */
  static notes(maxLength = 500) {
    return {
      type: 'string',
      maxLength
    };
  }

  /**
   * Creates a reference field schema
   */
  static reference(maxLength = 100) {
    return {
      type: 'string',
      maxLength
    };
  }
}

/**
 * Common validation schema fragments that can be reused
 */
export const CommonSchemas = {
  /**
   * Standard pagination query schema
   */
  pagination: {
    type: 'object',
    properties: {
      page: ValidationSchemaBuilder.numericString(),
      limit: ValidationSchemaBuilder.numericString()
    }
  },

  /**
   * Standard ID parameter schema
   */
  idParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: ValidationSchemaBuilder.id()
    }
  },

  /**
   * Standard sample ID parameter schema
   */
  sampleIdParam: {
    type: 'object',
    required: ['sampleId'],
    properties: {
      sampleId: ValidationSchemaBuilder.id()
    }
  },

  /**
   * Standard user ID field
   */
  userId: ValidationSchemaBuilder.id(),

  /**
   * Standard location ID field
   */
  locationId: ValidationSchemaBuilder.id(),

  /**
   * Standard sample type field
   */
  sampleType: ValidationSchemaBuilder.string({ minLength: 1, maxLength: 100 }),

  /**
   * Standard description field
   */
  description: ValidationSchemaBuilder.string({ maxLength: 1000 }),

  /**
   * Standard reference field
   */
  reference: ValidationSchemaBuilder.reference(),

  /**
   * Standard notes field
   */
  notes: ValidationSchemaBuilder.notes(),

  /**
   * Standard status enum
   */
  inventoryStatus: ValidationSchemaBuilder.enum(['AT_STATION', 'WITH_BUYER', 'IN_SHOWROOM', 'IN_STORAGE', 'DISPOSED']),

  /**
   * Standard approval status enum
   */
  approvalStatus: ValidationSchemaBuilder.enum(['PENDING', 'APPROVED', 'REJECTED'])
};

/**
 * Helper function to create a schema with required fields
 */
export function createSchema(properties: Record<string, any>, required: string[] = []) {
  return {
    type: 'object',
    required,
    properties
  };
}

/**
 * Helper function to merge multiple schemas
 */
export function mergeSchemas(...schemas: any[]) {
  const merged: any = {
    type: 'object',
    properties: {},
    required: []
  };

  schemas.forEach(schema => {
    if (schema.properties) {
      merged.properties = { ...merged.properties, ...schema.properties };
    }
    if (schema.required) {
      merged.required = [...merged.required, ...schema.required];
    }
  });

  // Remove duplicate required fields
  merged.required = [...new Set(merged.required)];

  return merged;
}
