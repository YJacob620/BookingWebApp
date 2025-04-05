import { Request } from 'express';
import path from 'path';
import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import emailService from './emailService'
import {
    BookingEntry,
    Infrastructure,
    User,
} from '../utils';
import { moveFileToStorage } from '../middleware/fileUploadMiddleware';

interface FilterQuestionAnswer {
    type: 'text' | 'file';
    value?: string;
    filePath?: string;
    originalName?: string;
    secureFilename?: string;
}

interface BookingRequestParams {
    email: string;
    timeslotId: number | string;
    purpose?: string;
    answers?: Record<string, FilterQuestionAnswer>;
}

interface BookingRequestResult {
    success: boolean;
    message?: string;
    booking?: BookingEntry;
    infrastructure?: Infrastructure;
    managers?: User[];
    actionToken?: string;
    missingAnswers?: number[];
}


/**
 * Interface for the result of parsing a booking request
 */
interface ParsedBookingRequest {
    valid: true;
    timeslotId: string | number;
    purpose: string;
    answers: Record<string, any>;
    email?: string;       // For guest bookings
    name?: string;        // For guest bookings
    infrastructureId?: number | string; // For guest bookings
    error?: string;
}

export interface ParsedBookingError {
    valid: false;
    error: string;
}

/**
 * Type for the result of parsing a booking request
 */
type BookingRequestParseResult = ParsedBookingRequest | ParsedBookingError;

/**
 * Process a booking request for either a logged-in user or a guest
 * 
 * @param connection - Database connection with transaction already begun
 * @param params - Booking parameters
 * @returns - Booking result with success status and related data
 */
const processBookingRequest =
    async (connection: PoolConnection | Pool, params: BookingRequestParams): Promise<BookingRequestResult> => {
        const {
            email,
            timeslotId,
            purpose = '',
            answers = {},
        } = params;

        try {
            // Check if the timeslot exists and is available
            const [timeslots] = await connection.execute<BookingEntry[]>(
                `SELECT * FROM bookings 
             WHERE id = ? 
             AND booking_type = 'timeslot' 
             AND status = 'available'`,
                [timeslotId]
            );

            if (timeslots.length === 0) {
                return { success: false, message: 'Timeslot not found or not available' };
            }

            const timeslot = timeslots[0];
            const infrastructure_id = timeslot.infrastructure_id;

            const [requiredQuestions] = await connection.execute<RowDataPacket[]>(
                `SELECT * FROM infrastructure_questions WHERE infrastructure_id = ? AND is_required = 1`,
                [infrastructure_id]
            );

            const missingAnswers = requiredQuestions
                .map(q => q.id)
                .filter(qId => {
                    const answer = answers[qId];
                    if (!answer) return true; // No answer provided

                    // Check based on answer type
                    if (answer.type === 'file') {
                        // For file uploads, consider it present if there's file information
                        return !answer.filePath && !answer.originalName;
                    } else if (answer.type === 'text') {
                        // For text-based answers, check the value property
                        return !answer.value?.trim();
                    }

                    // Default case - consider missing
                    return true;
                });

            if (missingAnswers.length > 0) {
                return {
                    success: false,
                    message: 'Not all required filter-questions were answered',
                    missingAnswers
                };
            }

            // Book the timeslot
            await connection.execute(
                `UPDATE bookings SET booking_type = 'booking', user_email = ?, status = 'pending', purpose = ? WHERE id = ?`,
                [email, purpose, timeslotId]
            );

            const [bookings] = await connection.execute<BookingEntry[]>(
                `SELECT * FROM bookings WHERE id = ?`,
                [timeslotId]
            );
            const booking = bookings[0];

            // Process file answers - move from temp to permanent location if needed
            for (const [questionId, answerData] of Object.entries(answers)) {
                let answerText = '';
                let documentPath = null;

                if (answerData.type === 'text') {
                    answerText = answerData.value || '';
                } else if (answerData.type === 'file') {
                    answerText = answerData.originalName || path.basename(answerData.filePath || '');

                    // If file is in temporary storage, move it to permanent booking-based storage
                    if (answerData.filePath && answerData.filePath.includes('temp')) {
                        const newPath = moveFileToStorage(
                            answerData.filePath,
                            booking.id,
                            answerData.secureFilename || path.basename(answerData.filePath)
                        );

                        if (newPath) {
                            documentPath = newPath;
                        } else {
                            return {
                                success: false,
                                message: 'Failed to process file uploads'
                            };
                        }
                    } else {
                        documentPath = answerData.filePath || null;
                    }
                }

                await connection.execute(
                    `INSERT INTO booking_answers (booking_id, question_id, answer_text, document_path) VALUES (?, ?, ?, ?)`,
                    [timeslotId, questionId, answerText, documentPath]
                );
            }

            // Fetch additional details
            const [infrastructures] = await connection.execute<Infrastructure[]>(
                'SELECT * FROM infrastructures WHERE id = ?',
                [infrastructure_id]
            );

            const [managers] = await connection.execute<User[]>(
                `SELECT u.id, u.name, u.email, u.email_notifications 
             FROM users u JOIN infrastructure_managers im ON u.id = im.user_id 
             WHERE im.infrastructure_id = ?`,
                [infrastructure_id]
            );

            // Generate token for email actions
            let actionToken: string | null = null;
            try {
                actionToken = await emailService.generateSecureActionToken(booking, connection);
            } catch (tokenError) {
                console.warn('Failed to generate action token:', tokenError);
            }

            // Send notifications
            if (infrastructures.length > 0 && managers.length > 0 && actionToken) {
                try {
                    await emailService.sendBookingNotifications(booking, infrastructures[0], managers, actionToken);
                } catch (emailError) {
                    console.error('Failed to send notification emails:', emailError);
                }
            }

            return {
                success: true,
                booking,
                infrastructure: infrastructures[0] || null,
                managers,
                actionToken: actionToken || undefined
            };
        } catch (error) {
            console.error('Error in processBookingRequest:', error);
            throw error;
        }
    };

/**
 * Parse and validate a booking request from FormData
 * Works for both user and guest booking requests
 * 
 * @param req - Express request object containing form data
 * @param isGuestBooking - Whether this is a guest booking (requires email and name)
 * @returns Parsed booking request or error object
 */
export const parseBookingRequest = (req: Request, isGuestBooking = false): BookingRequestParseResult => {
    try {
        // Extract core booking data
        const timeslotId = req.body.timeslot_id;
        const purpose = req.body.purpose || '';

        // Validate required params
        if (!timeslotId) {
            return { valid: false, error: 'Missing required parameter: timeslot_id' };
        }

        // For guest requests, validate additional fields
        if (isGuestBooking) {
            const { name, email, infrastructure_id } = req.body;

            if (!name || !email || !infrastructure_id) {
                return {
                    valid: false,
                    error: 'Missing required guest parameters: name, email, or infrastructure_id'
                };
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return { valid: false, error: 'Invalid email format' };
            }
        }

        // Process answers
        const answers: Record<string, any> = {};

        // First process non-file fields (excluding known booking params)
        const reservedFields = ['timeslot_id', 'purpose', 'name', 'email', 'infrastructure_id'];

        for (const key in req.body) {
            if (reservedFields.includes(key)) {
                continue;
            }

            answers[key] = {
                type: 'text',
                value: req.body[key]
            };
        }

        // Then process files
        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                const questionId = file.fieldname;

                // Skip if this is a reserved field
                if (reservedFields.includes(questionId)) {
                    continue;
                }

                // Get metadata from request
                const metadata = req.fileMetadata?.[questionId] || {
                    originalName: file.originalname,
                    secureFilename: path.basename(file.path)
                };

                answers[questionId] = {
                    type: 'file',
                    filePath: file.path,
                    originalName: metadata.originalName,
                    secureFilename: metadata.secureFilename
                };
            }
        }

        return {
            valid: true,
            timeslotId,
            purpose,
            answers,
            ...(isGuestBooking ? {
                email: req.body.email,
                name: req.body.name,
                infrastructureId: req.body.infrastructure_id
            } : {})
        };
    } catch (error) {
        console.error('Error parsing booking request:', error);
        return {
            valid: false,
            error: error instanceof Error ? error.message : 'Failed to parse booking request'
        };
    }
};

/**
 * Helper to track temporary files for potential cleanup
 * 
 * @param req - Express request object with files
 * @returns Array of file paths to track
 */
export const trackTempFiles = (req: Request): string[] => {
    const tempFiles: string[] = [];

    if (req.files && Array.isArray(req.files)) {
        req.files.forEach(file => tempFiles.push(file.path));
    }

    return tempFiles;
};

export {
    processBookingRequest,
};