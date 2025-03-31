/* Common interfaces shared across components */

export const USER_ROLES = ['admin', 'manager', 'faculty', 'student', 'guest'] as const;

export type UserRole = typeof USER_ROLES[number];

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_blacklisted: boolean
}

export interface RegistrationFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

export interface Infrastructure {
  id: number;
  name: string;
  description?: string;
  location?: string | null;
  is_active?: boolean;
}

export interface InfrastFormData {
  name: string;
  description: string;
  location: string;
  is_active: boolean;
}

export const BOOKING_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'completed',
  'expired',
  'canceled',
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const TIMESLOT_STATUSES = [
  'available',
  'expired',
  'canceled',
] as const;
export type TimeslotStatus = (typeof TIMESLOT_STATUSES)[number];

export const BOOKING_ENTRY_STATUSES = [
  ...BOOKING_STATUSES,
  ...TIMESLOT_STATUSES,
] as const;
export type BookingEntryStatus = (typeof BOOKING_ENTRY_STATUSES)[number];


/**
 * Combined interface representing both booking and timeslot entries.
 */
export interface BookingEntry {
  id: number;
  booking_type: 'booking' | 'timeslot';
  infrastructure_id: number;
  infrastructure_name: string;
  infrastructure_location?: string | null;
  booking_date: Date;
  start_time: string;
  end_time: string;
  status: BookingEntryStatus;
  user_email: string | null;
  user_role: string;
  purpose: string | null;
  created_at: string;
}

export interface BatchCreationPayload {
  infrastructureID: number;
  startDate: string;
  endDate: string;
  dailyStartTime: string;
  slotDuration: number;
  slotsPerDay: number;
}

export interface Message {
  type: 'success' | 'error' | 'warning' | 'neutral';
  text: string;
}

export interface SortConfig<T> {
  key: keyof T;
  direction: 'asc' | 'desc';
}

export interface FilterQuestionData {
  id: number;
  infrastructure_id: number;
  question_text: string;
  question_type: 'dropdown' | 'text' | 'number' | 'document';
  is_required: boolean;
  options?: string;
  display_order: number;
}

export type FilterQuestionsAnswersType = string | number | File | null;

export interface BookingAnswer {
  question_id: number;
  question_text: string;
  question_type: 'dropdown' | 'text' | 'number' | 'document';
  answer_text: string | null;
  document_url?: string;
}

export interface BookingDetails {
  booking: BookingEntry;
  answers: BookingAnswer[];
}