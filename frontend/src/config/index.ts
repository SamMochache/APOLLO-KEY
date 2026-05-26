/**
 * Environment Configuration
 */

export const config = {
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  apiTimeout: import.meta.env.VITE_API_TIMEOUT ? parseInt(import.meta.env.VITE_API_TIMEOUT) : 30000,
  appName: import.meta.env.VITE_APP_NAME || 'Apollo Key',
  appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  isDevelopment: import.meta.env.MODE === 'development',
  isProduction: import.meta.env.MODE === 'production',
};

export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: '/auth/login/',
    REGISTER: '/auth/register/',
    LOGOUT: '/auth/logout/',
    REFRESH: '/auth/refresh/',
    ME: '/auth/me/',
    PASSWORD_RESET: '/auth/password-reset/',
    PASSWORD_RESET_CONFIRM: '/auth/password-reset-confirm/',
  },
  
  // User Management
  USERS: {
    LIST: '/users/',
    DETAIL: (id: number) => `/users/${id}/`,
    UPDATE: (id: number) => `/users/${id}/`,
    DELETE: (id: number) => `/users/${id}/`,
    PROFILE: '/users/me/profile/',
  },

  // Academics
  ACADEMICS: {
    LIST: '/academics/',
    DETAIL: (id: number) => `/academics/${id}/`,
    GRADES: '/academics/grades/',
    ATTENDANCE: '/academics/attendance/',
    TIMETABLE: '/academics/timetable/',
  },

  // Attendance
  ATTENDANCE: {
    LIST: '/attendance/',
    CREATE: '/attendance/',
    RECORD: '/attendance/record/',
    STATISTICS: '/attendance/statistics/',
  },

  // Grades
  GRADES: {
    LIST: '/grades/',
    CREATE: '/grades/',
    ANALYTICS: '/grades/analytics/',
  },

  // Messaging
  MESSAGING: {
    MESSAGES: '/messages/',
    SEND: '/messages/send/',
    READ: (id: number) => `/messages/${id}/mark-read/`,
  },

  // Analytics
  ANALYTICS: {
    PERFORMANCE: '/analytics/performance/',
    ATTENDANCE_STATS: '/analytics/attendance/',
    GRADE_STATS: '/analytics/grades/',
  },
} as const;
