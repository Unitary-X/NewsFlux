/**
 * Centralized Configuration for Frontend
 * All environment-based settings should be sourced from here
 */

// API Configuration — use relative path so Vite proxy handles it in dev
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

// Frontend Configuration
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

// Feature Flags
export const FEATURES = {
  OFFLINE_SYNC_ENABLED: true,
  GOOGLE_DRIVE_BACKUP: true,
  ANNOUNCEMENTS_ENABLED: true,
  AUDIT_LOGGING_ENABLED: true,
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    LOGOUT: `${API_BASE_URL}/auth/logout`,
    REFRESH: `${API_BASE_URL}/auth/refresh`,
    FORGOT_PASSWORD: `${API_BASE_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_BASE_URL}/auth/reset-password`,
    REGISTER: `${API_BASE_URL}/auth/register`,
  },
  ADMIN: {
    DASHBOARD: `${API_BASE_URL}/admin/dashboard`,
    STOCK: `${API_BASE_URL}/admin/stock`,
    NEWSPAPERS: `${API_BASE_URL}/admin/newspapers`,
    WORKERS: `${API_BASE_URL}/admin/workers`,
    CUSTOMERS: `${API_BASE_URL}/admin/customers`,
    SUBSCRIPTIONS: `${API_BASE_URL}/admin/subscriptions`,
    ASSIGNMENTS: `${API_BASE_URL}/admin/assignments`,
    BILLING: `${API_BASE_URL}/admin/billing`,
    SALARIES: `${API_BASE_URL}/admin/salaries`,
    REPORTS: `${API_BASE_URL}/admin/reports`,
    BACKUP: `${API_BASE_URL}/admin/backup`,
  },
  WORKER: {
    ASSIGNMENTS: `${API_BASE_URL}/worker/assignments`,
    SYNC: `${API_BASE_URL}/worker/offline-sync`,
    ANNOUNCEMENTS: `${API_BASE_URL}/worker/announcements`,
    ROUTE: `${API_BASE_URL}/worker/route`,
    SALES: `${API_BASE_URL}/worker/sales`,
    SALARY: `${API_BASE_URL}/worker/salary`,
  },
  SUPERADMIN: {
    AGENCIES: `${API_BASE_URL}/superadmin/agencies`,
    ANALYTICS: `${API_BASE_URL}/superadmin/analytics`,
    AUDIT_LOGS: `${API_BASE_URL}/superadmin/audit-logs`,
    SETTINGS: `${API_BASE_URL}/superadmin/settings`,
    ANNOUNCEMENTS: `${API_BASE_URL}/superadmin/announcements`,
    BACKUP: `${API_BASE_URL}/superadmin/backup`,
  },
};

// Timeout configurations (ms)
export const TIMEOUTS = {
  SHORT: 5000,    // 5 seconds for quick operations
  MEDIUM: 15000,  // 15 seconds for standard operations
  LONG: 30000,    // 30 seconds for uploads/exports
};

// Token Configuration
export const TOKEN_CONFIG = {
  ACCESS_TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  TOKEN_REFRESH_INTERVAL: 10 * 60 * 1000, // 10 minutes
};

// Localization
export const SUPPORTED_LANGUAGES = ['en', 'ta'];
export const DEFAULT_LANGUAGE = 'en';
export const LANGUAGE_STORAGE_KEY = 'user_language';

// Sync Configuration
export const SYNC_CONFIG = {
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
  BATCH_SIZE: 50,
};

export default {
  API_BASE_URL,
  FRONTEND_URL,
  FEATURES,
  API_ENDPOINTS,
  TIMEOUTS,
  TOKEN_CONFIG,
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
  LANGUAGE_STORAGE_KEY,
  SYNC_CONFIG,
};
