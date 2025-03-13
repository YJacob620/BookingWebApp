/* Common interfaces shared across components */

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

type BookingEntryStatus = 'available' | 'pending' | 'approved' | 'rejected' | 'completed' | 'expired' | 'canceled';

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
  type: 'success' | 'error' | 'warning' | '';
  text: string;
}

export interface SortConfig<T> {
  key: keyof T | null;
  direction: 'asc' | 'desc';
}