/**
 * API Response Types
 */

export interface ApiResponse<T> {
  data: T;
  status: number;
  message?: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ErrorResponse {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  detail?: string;
}

/**
 * Common Types
 */

export interface TimeRange {
  startTime: string;
  endTime: string;
}

export interface Schedule {
  id: number;
  day: string;
  startTime: string;
  endTime: string;
  subject?: string;
  room?: string;
}

export interface GradeLevel {
  id: number;
  name: string;
  code: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
}

export interface Attendance {
  id: number;
  student_id: number;
  date: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  remarks?: string;
  recorded_by?: number;
  created_at: string;
  updated_at: string;
}

export interface Grade {
  id: number;
  student_id: number;
  subject_id: number;
  score: number;
  grade: string;
  term: string;
  academic_year: string;
  recorded_by?: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  sender_id: number;
  recipient_id?: number;
  subject: string;
  body: string;
  is_read: boolean;
  created_at: string;
  updated_at: string;
}

export interface Recipient {
  id: number;
  name: string;
  email?: string;
}

export interface Thread {
  id: number;
  subject?: string;
  participants?: Recipient[];
  messages: Message[];
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  attendance_rate: number;
  [key: string]: any;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
}
