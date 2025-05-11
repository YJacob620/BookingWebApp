import express, { Request, Response } from 'express';
import argon2 from 'argon2';
import fs from 'fs';
import { upload, moveFileToStorage } from '../middleware/fileUploadMiddleware';
import emailService from '../utils/emailService';
import pool from '../configuration/db';
import {
    processBookingRequest,
    BookingEntry,
    generateToken,
    findUserByIdOrEmail,
    parseBookingRequest,
    trackTempFiles,
    handleBookingError
} from '../utils';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
const router = express.Router();

let GUEST_MAX_BOOKINGS_PER_DAY = 1;

interface TempFileInfo {
    originalName: string,
    tempPath: string,
    secureFilename: string
}

/**
 * An interface representing a row in the email_action_tokens table.
 */
interface EmailActionTokensEntry extends RowDataPacket {
    id: number,
    token: string,
    booking_id: number,
    /**
     * Metadata regarding the action token, if not empty then usually an output of JSON.stringify()
     */
    metadata: string,
    expired: string,
    created_at: string,
    used: number,
    used_at: string
}

// Handle guest booking request initiation
router.post('/request', upload.any(), async (req: Request, res: Response): Promise<void> => {
    const connection = await pool.getConnection();
    let tempFiles: string[] = [];

    try {
        await connection.beginTransaction();

        // Parse booking request with guest validation
        const parsedRequest = parseBookingRequest(req, true);

        if (!parsedRequest.valid) {
            res.status(400).json({
                success: false,
                message: parsedRequest.error
            });
            return;
        }

        // Track uploaded files for potential cleanup
        tempFiles = trackTempFiles(req);

        // Extract data from the parsed request
        const { email, name, timeslotId, infrastructureId, purpose, answers } = parsedRequest as {
            email: string;
            name: string;
            timeslotId: string | number;
            infrastructureId: string | number;
            purpose: string;
            answers: Record<string, any>;
        };

        // Check existence of requested timeslot
        const [timeslots] = await connection.execute<BookingEntry[]>(
            'SELECT * FROM bookings WHERE id = ? AND booking_type = "timeslot" AND status = "available"',
            [timeslotId]
        );

        if (timeslots.length === 0) {
            await handleBookingError(connection, tempFiles, res, 404, 'Timeslot not found or not available');
            return;
        }

        // Check if there's an existing user, register as a guest if not
        const user = await findUserByIdOrEmail({ email });
        let userId: number;

        if (!user) {
            const tempPassword = generateToken();
            const passwordHash: string = await argon2.hash(tempPassword);
            const [result] = await connection.execute<ResultSetHeader>(
                `INSERT INTO users (email, password_hash, name, role, is_verified) 
           VALUES (?, ?, ?, 'guest', 0)`,
                [email, passwordHash, name]
            );
            userId = result.insertId;
        } else {
            userId = user.id;
            if (user.role !== 'guest') {
                await handleBookingError(connection, tempFiles, res, 400,
                    'This email is already registered. Please login to book.');
                return;
            }

            // Update guest user name and verification status
            await connection.execute(
                'UPDATE users SET is_verified = 0, name = ? WHERE id = ?',
                [name, userId]
            );
        }

        // Check if guest has already made bookings today
        const today: string = new Date().toISOString().split('T')[0];
        const [existingBookings] = await connection.execute<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM bookings 
         WHERE user_email = ? AND booking_date = ? 
         AND booking_type = 'booking' AND status != 'canceled'`,
            [email, today]
        );

        const GUEST_MAX_BOOKINGS_PER_DAY = 1; // Could be moved to a config file

        if (existingBookings[0].count >= GUEST_MAX_BOOKINGS_PER_DAY) {
            await handleBookingError(connection, tempFiles, res, 429,
                'You have already made a booking today. Try again tomorrow.');
            return;
        }

        // Create booking token and prepare for email verification
        const bookingToken = generateToken();
        const expires: Date = new Date();
        expires.setHours(expires.getHours() + 24);

        // Save token with metadata
        await connection.execute(
            `INSERT INTO email_action_tokens 
         (token, booking_id, expires, metadata) 
         VALUES (?, ?, ?, ?)`,
            [
                bookingToken,
                timeslotId,
                expires,
                JSON.stringify({
                    type: 'guest_booking',
                    email,
                    name,
                    purpose,
                    userId,
                    infrastructureId,
                    answers
                })
            ]
        );

        // Send verification email
        const verificationUrl: string = `${process.env.FRONTEND_URL}/guest-confirm/${bookingToken}`;
        await emailService.sendGuestBookingVerificationEmail(name, email, verificationUrl);

        await connection.commit();

        // Once committed, don't delete the files
        tempFiles = [];

        res.json({
            success: true,
            message: 'Booking verification email sent. Please check your inbox to confirm your booking.',
            email
        });
    } catch (error) {
        console.error('Error initiating guest booking:', error);
        await handleBookingError(connection, tempFiles, res, 500, 'Failed to process booking request');
    } finally {
        connection.release();
    }
});

// Process guest booking confirmation from email link
router.get('/confirm-booking/:token', async (req: Request, res: Response): Promise<void> => {
    const connection = await pool.getConnection();
    const tempFiles: string[] = []; // Track files for potential cleanup

    try {
        await connection.beginTransaction();

        // Verify token
        const token = req.params.token;
        const [tokens] = await connection.execute<EmailActionTokensEntry[]>(
            `SELECT * FROM email_action_tokens 
             WHERE token=? AND used=0 AND expires > NOW()`,
            [token]
        );
        if (tokens.length === 0) {
            await handleBookingError(connection, tempFiles, res, 400, 'Invalid or expired booking token');
            return;
        }
        const tokenData = tokens[0];
        const metadata: Record<string, any> = JSON.parse(tokenData.metadata || '{}');
        if (metadata.type !== 'guest_booking') {
            await handleBookingError(connection, tempFiles, res, 400, 'Invalid token');
            return;
        }

        // Check if guest has already made bookings today
        const today: string = new Date().toISOString().split('T')[0];
        const [existingBookings] = await connection.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE user_email=? AND booking_date=? 
             AND booking_type='booking' AND status!='canceled'`,
            [metadata.email, today]
        );
        if (existingBookings[0].count >= GUEST_MAX_BOOKINGS_PER_DAY) {
            await handleBookingError(connection, tempFiles, res, 429,
                'You have already made a booking today. Try again tomorrow.');
            return;
        }

        // Process the stored file references
        const tempUploadedFiles: Record<string, TempFileInfo> = metadata.uploadedFiles || {};
        const enhancedAnswers = { ...metadata.answers };

        // Track if all file operations succeeded
        let allFilesProcessed = true;

        for (const [questionId, fileInfo] of Object.entries(tempUploadedFiles)) {
            if (fileInfo.tempPath && fs.existsSync(fileInfo.tempPath)) {
                // Add to tracked files
                tempFiles.push(fileInfo.tempPath);

                // Move to permanent storage with standardized structure
                const finalPath = moveFileToStorage(
                    fileInfo.tempPath,
                    tokenData.booking_id,
                    fileInfo.secureFilename
                );

                if (finalPath) {
                    // Update answers with file info
                    enhancedAnswers[questionId] = {
                        type: 'file',
                        filePath: finalPath,
                        originalName: fileInfo.originalName,
                        secureFilename: fileInfo.secureFilename
                    };
                } else {
                    allFilesProcessed = false;
                    break;
                }
            }
        }

        // If any file operation failed, roll back
        if (!allFilesProcessed) {
            await handleBookingError(connection, tempFiles, res, 500, 'Error processing file uploads');
            return;
        }

        // Process the booking request
        const bookingResult = await processBookingRequest(connection, {
            email: metadata.email,
            timeslotId: tokenData.booking_id,
            purpose: metadata.purpose || '',
            answers: enhancedAnswers || {},
        });

        if (!bookingResult.success) {
            await handleBookingError(connection, tempFiles, res, 400, bookingResult.message);
            return;
        }

        if (!bookingResult.booking) {
            await handleBookingError(connection, tempFiles, res, 400, 'Internal server error');
            return;
        }

        // Mark token as used   
        await connection.execute(
            `UPDATE email_action_tokens SET used=1, used_at=NOW() WHERE id=?`,
            [tokenData.id]);

        await connection.commit();

        // Send notifications
        if (bookingResult.infrastructure && bookingResult.managers.length > 0 && bookingResult.actionToken) {
            try {
                await emailService.sendBookingNotifications(
                    bookingResult.booking,
                    bookingResult.infrastructure,
                    bookingResult.managers,
                    bookingResult.actionToken);
            } catch (emailError) {
                console.error('Failed to send notification emails:', emailError);
            }
        }

        // Once the transaction is committed successfully, we can clear the tempFiles array
        // since we don't want to delete the files that have been properly moved
        tempFiles.length = 0;

        res.json({
            success: true,
            message: 'Booking confirmed successfully',
            data: {
                bookedID: bookingResult.booking.id,
                infrastructureName: bookingResult.infrastructure?.name,
                date: bookingResult.booking.booking_date,
                time: `${bookingResult.booking.start_time} - ${bookingResult.booking.end_time}`
            }
        });
    } catch (error) {
        await handleBookingError(connection, tempFiles, res, 500, 'Failed to confirm booking');
    } finally {
        connection.release();
    }
});

export default router;