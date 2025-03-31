import { RowDataPacket } from 'mysql2/promise';

// Extend Request interface to include user property
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

// ===== Auth & User Types =====
export type UserRole = 'admin' | 'faculty' | 'student' | 'guest' | 'manager';

export interface User extends RowDataPacket {
    id: number;
    email: string;
    password_hash: string;
    name: string;
    role: UserRole;
    is_verified: boolean;
    verification_token: string | null;
    verification_token_expires: Date | null;
    password_reset_token: string | null;
    password_reset_expires: Date | null;
    is_blacklisted?: boolean;
    email_notifications?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface JwtPayload {
    userId: number;
    email: string;
    role: string;
}

// ===== Infrastructure Types =====
export interface Infrastructure extends RowDataPacket {
    id: number;
    name: string;
    description?: string;
    location?: string;
    is_active?: boolean;
    created_at?: Date;
    updated_at?: Date;
}

export interface InfrastructureQuestion extends RowDataPacket {
    id?: number;
    infrastructure_id: number;
    question_text: string;
    question_type: 'text' | 'number' | 'dropdown' | 'document';
    is_required: boolean | number;
    options: string | null;
    display_order: number;
}

export interface QuestionReorderItem {
    id: number;
    display_order: number;
}

// ===== Booking Types =====
export type BookingStatus = 'available' | 'pending' | 'approved' | 'rejected' | 'canceled' | 'completed';

export interface BookingEntry extends RowDataPacket {
    id: number;
    infrastructure_id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: BookingStatus;
    booking_type: 'booking' | 'timeslot';
    user_email: string | null;
    purpose?: string;
}

export interface BookingRequestBody {
    infrastructureID: number;
    startDate: string;
    endDate: string;
    dailyStartTime: string;
    slotDuration: number;
    slotsPerDay: number;
}

export interface BookingCancelBody {
    ids: number[];
}

export interface BookingStatusBody {
    status: 'rejected' | 'canceled';
}

// ===== Email & Notification Types =====
export interface EmailActionToken extends RowDataPacket {
    id: number;
    token: string;
    booking_id: number;
    expires: Date;
    used: boolean;
    used_at: Date | null;
    metadata: string | null;
}