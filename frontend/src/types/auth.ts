/**
 * Authentication Types
 */

export type UserRole = 'admin' | 'teacher' | 'parent' | 'student';

export interface User {
  id: number;
  username: string;
  email: string;
  role: UserRole;
  first_name?: string;
  last_name?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  username: string;
  password: string;
  password2: string;
  role: UserRole;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  uid: string;
  token: string;
  new_password: string;
  new_password2: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}

export interface TokenPayload {
  user_id: number;
  username: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}
