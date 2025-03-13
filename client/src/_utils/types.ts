/* Common interfaces shared across components */

// User related
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'faculty' | 'student' | 'guest';
}

export interface RegistrationFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

// Infrastructure related
export interface Infrastructure {
  id: number;
  name: string;
  description?: string;
  location?: string | null;
  is_active?: boolean;
  max_booking_duration?: number;
}

export interface InfrastFormData {
  name: string;
  description: string;
  location: string;
  is_active: boolean;
}

// Booking related
export interface Booking {
  id: number;
  infrastructure_id: number;
  infrastructure_name?: string;
  infrastructure_location?: string | null;
  user_email: string;
  user_role?: string;
  booking_date: Date;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  purpose: string;
  created_at: Date;
}

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'completed'
  | 'expired'
  | 'canceled';

// Timeslot related
export interface Timeslot {
  id: number;
  infrastructure_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'available' | 'canceled' | 'expired';
}

export interface CalendarItem {
  type: 'timeslot' | 'booking';
  id: number;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  user_email?: string;
  purpose?: string;
}

/**
 * Combined interface representing both booking and timeslot entries
 * from the unified API endpoint
 */
export interface BookingEntry {
  id: number;
  booking_type: 'booking' | 'timeslot';
  infrastructure_id: number;
  infrastructure_name?: string;
  infrastructure_location?: string | null;
  booking_date: Date;
  start_time: string;
  end_time: string;
  status: string;
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

// Generic UI-related
export interface Message {
  type: 'success' | 'error' | 'warning' | '';
  text: string;
}

// Sorting
export interface SortConfig<T> {
  key: keyof T | null;
  direction: 'asc' | 'desc';
}