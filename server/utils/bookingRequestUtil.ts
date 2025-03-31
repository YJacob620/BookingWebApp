import path from 'path';
import { Pool, PoolConnection, RowDataPacket } from 'mysql2/promise';
import emailService from './emailService'
import {
    BookingEntry,
    Infrastructure,
    User,
} from '../utils';

interface QuestionAnswer {
    type: 'text' | 'file';
    value?: string;
    filePath?: string;
    originalName?: string;
}

interface BookingRequestParams {
    email: string;
    timeslotId: number | string;
    purpose?: string;
    answers?: Record<string, QuestionAnswer>;
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
                `SELECT id FROM infrastructure_questions WHERE infrastructure_id = ? AND is_required = 1`,
                [infrastructure_id]
            );

            const missingAnswers = requiredQuestions
                .map(q => q.id)
                .filter(qId => !answers[qId] || !answers[qId].value?.trim());

            if (missingAnswers.length > 0) {
                return {
                    success: false,
                    message: 'All required questions must be answered',
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

            // Save answers if provided
            for (const [questionId, answerData] of Object.entries(answers)) {
                const answerText = answerData.type === 'text' ? answerData.value : path.basename(answerData.originalName || '');
                const documentPath = answerData.type === 'file' ? answerData.filePath : null;

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

export {
    processBookingRequest,
    type BookingRequestParams,
    type BookingRequestResult,
    type QuestionAnswer
};