/**
 * Application-wide constants
 * Centralized location for configuration values, eliminating hardcoded strings
 */

// ============= Default Values =============
export const DEFAULT_USER_ID = 'cmm3swdvq00025gbj3iow7gti'; // TODO: Replace with actual auth context

export const DEFAULT_PAGINATION = {
  PAGE: 1,
  LIMIT: 50,
  MAX_LIMIT: 100
} as const;

// ============= Sample Types =============
export const SAMPLE_TYPES = {
  LABORATORY: 'LABORATORY',
  PRODUCTION: 'PRODUCTION',
  SHOWROOM: 'SHOWROOM',
  DEVELOPMENT: 'DEVELOPMENT'
} as const;

// ============= Inventory Status =============
export const INVENTORY_STATUS = {
  IN_SHOWROOM: 'IN_SHOWROOM',
  AT_STATION: 'AT_STATION',
  WITH_BUYER: 'WITH_BUYER',
  IN_STORAGE: 'IN_STORAGE',
  DISPOSED: 'DISPOSED'
} as const;

// ============= Sample Status (New PRD) =============
export const SAMPLE_STATUS = {
  IN_TRANSIT_TO_DISPATCH: 'IN_TRANSIT_TO_DISPATCH',
  AT_DISPATCH: 'AT_DISPATCH',
  WITH_MERCHANDISER: 'WITH_MERCHANDISER',
  IN_STORAGE: 'IN_STORAGE',
  PENDING_TRANSFER_APPROVAL: 'PENDING_TRANSFER_APPROVAL',
  DISPOSED: 'DISPOSED'
} as const;

// ============= Approval Status =============
export const APPROVAL_STATUS = {
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED'
} as const;

// ============= Location Types =============
export const LOCATION_TYPES = {
  SHOWROOM: 'SHOWROOM',
  WAREHOUSE: 'WAREHOUSE',
  STATION: 'STATION',
  BUYER: 'BUYER'
} as const;

// ============= Validation Rules =============
export const VALIDATION_LIMITS = {
  DESCRIPTION_MAX_LENGTH: 500,
  REFERENCE_MAX_LENGTH: 100,
  FEEDBACK_MAX_LENGTH: 500,
  NOTES_MAX_LENGTH: 500,
  EMAIL_MAX_LENGTH: 255,
  NAME_MAX_LENGTH: 255,
  PASSWORD_MIN_LENGTH: 8,
  PASSWORD_MAX_LENGTH: 128,
  MFA_CODE_LENGTH: 6
} as const;

// ============= Form Field Names =============
export const FORM_FIELDS = {
  DESCRIPTION: 'description',
  REFERENCE: 'reference',
  OUTCOME: 'outcome',
  FEEDBACK: 'feedback',
  SAMPLE_TYPE: 'sample_type',
  LOCATION_ID: 'location_id',
  EMAIL: 'email',
  PASSWORD: 'password',
  MFA_CODE: 'mfaCode'
} as const;

// ============= Error Messages =============
export const ERROR_MESSAGES = {
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  MIN_LENGTH: (field: string, length: number) => `${field} must be at least ${length} characters`,
  MAX_LENGTH: (field: string, length: number) => `${field} must be ${length} characters or less`,
  INVALID_FORMAT: (field: string) => `${field} format is invalid`,
  GENERIC_ERROR: 'An unexpected error occurred',
  NETWORK_ERROR: 'Network error. Please check your connection.',
  NOT_FOUND: 'The requested resource was not found',
  UNAUTHORIZED: 'You are not authorized to perform this action',
  VALIDATION_ERROR: 'Please check your input and try again'
} as const;

// ============= Success Messages =============
export const SUCCESS_MESSAGES = {
  SAMPLE_CREATED: 'Sample created successfully',
  SAMPLE_UPDATED: 'Sample updated successfully',
  SAMPLE_DELETED: 'Sample deleted successfully',
  APPROVAL_UPDATED: 'Approval record updated successfully',
  CHECKOUT_SUCCESS: 'Sample checked out successfully',
  CHECKIN_SUCCESS: 'Sample checked in successfully',
  LABEL_GENERATED: 'Label generated successfully',
  CHANGES_SAVED: 'Changes saved successfully'
} as const;

// ============= Route Paths =============
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  DASHBOARD: '/dashboard',
  SAMPLES: '/samples',
  SAMPLE_DETAILS: (id: string) => `/samples/${id}`,
  INVENTORY: '/inventory',
  REPORTS: '/reports',
  ADMIN: '/admin',
  DISPATCH: '/dispatch',
  UNAUTHORIZED: '/unauthorized'
} as const;

// ============= API Endpoints =============
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/v1/auth/login',
    LOGOUT: '/api/v1/auth/logout',
    REFRESH: '/api/v1/auth/refresh',
    SSO_CALLBACK: '/api/v1/auth/sso/callback'
  },
  SAMPLES: {
    BASE: '/api/v1/samples',
    BY_ID: (id: string) => `/api/v1/samples/${id}`,
    PRINT: (id: string) => `/api/v1/samples/${id}/print`
  },
  INVENTORY: {
    CHECKOUT: '/api/v1/inventory/checkout',
    CHECKIN: '/api/v1/inventory/checkin',
    HISTORY: (sampleId: string) => `/api/v1/inventory/history/${sampleId}`
  },
  LOCATIONS: '/api/v1/locations',
  APPROVALS: '/api/v1/approvals',
  REPORTS: '/api/v1/reports'
} as const;

// ============= Local Storage Keys =============
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'centrotex_access_token',
  REFRESH_TOKEN: 'centrotex_refresh_token',
  USER_DATA: 'centrotex_user_data',
  THEME: 'centrotex_theme',
  LANGUAGE: 'centrotex_language'
} as const;

// ============= Time Constants =============
export const TIME = {
  DEBOUNCE_DELAY: 300,
  API_TIMEOUT: 10000,
  TOKEN_REFRESH_BUFFER: 60000, // 1 minute before expiry
  SESSION_CHECK_INTERVAL: 60000 // 1 minute
} as const;

// ============= Feature Flags =============
export const FEATURES = {
  ENABLE_MFA: true,
  ENABLE_SSO: true,
  ENABLE_NOTIFICATIONS: true,
  ENABLE_AUDIT_LOG: true,
  ENABLE_REPORTS: true
} as const;

// ============= Type Exports =============
export type SampleType = typeof SAMPLE_TYPES[keyof typeof SAMPLE_TYPES];
export type InventoryStatus = typeof INVENTORY_STATUS[keyof typeof INVENTORY_STATUS];
export type ApprovalStatus = typeof APPROVAL_STATUS[keyof typeof APPROVAL_STATUS];
export type LocationType = typeof LOCATION_TYPES[keyof typeof LOCATION_TYPES];
