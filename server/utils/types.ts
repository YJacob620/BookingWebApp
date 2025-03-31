import { RowDataPacket, ResultSetHeader } from 'mysql2/promise';

// ===== Auth & User Types =====
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

export type UserRole = 'admin' | 'faculty' | 'student' | 'guest' | 'manager';

export interface JwtPayload {
    userId: number;
    email: string;
    role: string;
}

// ===== Request Body Types =====
export interface RegisterRequestBody {
    email: string;
    password: string;
    name: string;
    role?: UserRole;
}

export interface LoginRequestBody {
    email: string;
    password: string;
}

export interface EmailRequestBody {
    email: string;
}

export interface ResetPasswordRequestBody {
    password: string;
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
export interface Booking extends RowDataPacket {
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

export type BookingStatus = 'available' | 'pending' | 'approved' | 'rejected' | 'canceled' | 'completed';

export interface BookingTimeslot extends Booking {
    // Extends Booking with any timeslot-specific fields
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

export interface Manager {
    id: number;
    name?: string;
    email: string;
    email_notifications: boolean;
}

// ===== File Upload Types =====
export interface FileUploadFile extends Express.Multer.File {
    originalFilename?: string;
}

// ===== Booking Request Types =====
export interface QuestionAnswer {
    type: 'text' | 'file';
    value?: string;
    filePath?: string;
    originalName?: string;
}

export interface BookingRequestParams {
    email: string;
    timeslotId: number | string;
    purpose?: string;
    answers?: Record<string, QuestionAnswer>;
    skipAnswerValidation?: boolean;
}

export interface BookingRequestResult {
    success: boolean;
    message?: string;
    booking?: BookingTimeslot;
    infrastructure?: Infrastructure;
    managers?: Manager[];
    actionToken?: string;
    missingAnswers?: number[];
}

// ===== Database Helper Types =====
export interface TimeslotOverlap extends RowDataPacket {
    count: number;
}

// Declare global namespace augmentations here so they're centralized
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            userRole?: string;
        }
    }
}