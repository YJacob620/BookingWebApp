import express, { Request, Response } from 'express';
import argon2 from 'argon2';
import fs from 'fs';
import path from 'path';
import { upload, tempUploadDir, uploadDir, moveFileToStorage, cleanupTempFiles } from '../middleware/fileUploadMiddleware';

import emailService from '../utils/emailService';
import pool from '../configuration/db';
import {
    processBookingRequest,
    BookingEntry,
    User,
    generateToken,
    findUserByIdOrEmail
} from '../utils';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
const router = express.Router();

let GUEST_MAX_BOOKINGS_PER_DAY = 1;

interface FileMetadata {
    originalName: string;
    tempPath: string;
    secureFilename: string;
}

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
    const tempFiles: string[] = []; // Track temporary files for cleanup

    try {
        await connection.beginTransaction();

        // Extract basic parameters from req.body
        const email = req.body.email;
        const name = req.body.name;
        const infrastructureId = parseInt(req.body.infrastructureId, 10);
        const timeslotId = parseInt(req.body.timeslotId, 10);
        const purpose = req.body.purpose || '';

        // Handle answers - parse from answersJSON if available
        let parsedAnswers: Record<string, any> = {};
        if (req.body.answersJSON) {
            try {
                parsedAnswers = JSON.parse(req.body.answersJSON);
                console.log('Parsed answers from JSON:', parsedAnswers);
            } catch (e) {
                console.error('Error parsing answersJSON:', e);
            }
        }

        // Validate required parameters
        if (!email || !name || !infrastructureId || !timeslotId) {
            res.status(400).json({
                success: false,
                message: 'Name, email, infrastructure ID, and timeslot ID are required'
            });
            return;
        }

        const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
            return;
        }

        // Check existence of requested timeslot
        const [timeslots] = await connection.execute<BookingEntry[]>(
            'SELECT * FROM bookings WHERE id = ? AND booking_type = "timeslot" AND status = "available"',
            [timeslotId]
        );
        if (timeslots.length === 0) {
            await connection.rollback();
            // Cleanup any temporary files
            cleanupTempFiles(tempFiles);

            res.status(404).json({
                success: false,
                message: 'Timeslot not found or not available'
            });
            return;
        }

        // Check if there's an existing user, register as a guest if not
        const user = await findUserByIdOrEmail({ email: email });
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
                await connection.rollback();
                // Cleanup any temporary files
                cleanupTempFiles(tempFiles);

                res.status(400).json({
                    success: false,
                    message: 'This email is already registered. Please login to book.'
                });
                return;
            }
            await connection.execute(
                'UPDATE users SET is_verified = 0 WHERE id = ?',
                [userId]
            );
            await connection.execute(
                'UPDATE users SET name = ? WHERE id = ?',
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
        if (existingBookings[0].count >= GUEST_MAX_BOOKINGS_PER_DAY) {
            await connection.rollback();
            // Cleanup any temporary files
            cleanupTempFiles(tempFiles);

            res.status(429).json({
                success: false,
                message: 'You have already made a booking today. Try again tomorrow.'
            });
            return;
        }

        // Create booking token and prepare for email verification
        const bookingToken = generateToken();
        const expires: Date = new Date();
        expires.setHours(expires.getHours() + 24);

        // Process uploaded files
        const uploadedFiles: Record<string, TempFileInfo> = {};
        console.log('Files received:', req.files);

        if (req.files && Array.isArray(req.files)) {
            for (const file of req.files) {
                console.log('Processing file:', file.fieldname, file.originalname);

                // Extract questionId from field name
                const questionId = file.fieldname.replace('file_', '');

                // Get metadata from request
                const metadata = req.fileMetadata?.[file.fieldname] || {
                    originalName: file.originalname,
                    secureFilename: path.basename(file.path)
                };

                // Store temporary path for later confirmation
                tempFiles.push(file.path);

                // Store file reference with metadata
                uploadedFiles[questionId] = {
                    originalName: metadata.originalName,
                    tempPath: file.path,
                    secureFilename: metadata.secureFilename
                };

                console.log(`File ${metadata.originalName} stored at ${file.path}`);
            }
        }

        // Save token with metadata including answers and uploaded files
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
                    purpose,
                    answers: parsedAnswers,
                    userId,
                    uploadedFiles
                })
            ]
        );

        // Send verification email
        const verificationUrl: string = `${process.env.FRONTEND_URL}/guest-confirm/${bookingToken}`;
        await emailService.sendGuestBookingVerificationEmail(name, email, verificationUrl);

        await connection.commit();
        res.json({
            success: true,
            message: 'Booking verification email sent. Please check your inbox to confirm your booking.',
            email
        });
    } catch (error) {
        await connection.rollback();
        // Cleanup any temporary files on error
        cleanupTempFiles(tempFiles);

        console.error('Error initiating guest booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to process booking request'
        });
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
            await connection.rollback();
            res.status(400).json({
                success: false,
                message: 'Invalid or expired booking token'
            });
            return;
        }
        const tokenData = tokens[0];
        const metadata: Record<string, any> = JSON.parse(tokenData.metadata || '{}');
        if (metadata.type !== 'guest_booking') {
            await connection.rollback();
            res.status(400).json({
                success: false,
                message: 'Invalid token type'
            });
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
            await connection.rollback();
            res.status(429).json({
                success: false,
                message: 'You have already made a booking today. Try again tomorrow.'
            });
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
            await connection.rollback();
            // Cleanup any files that might have been successfully moved
            cleanupTempFiles(tempFiles);

            res.status(500).json({
                success: false,
                message: 'Error processing file uploads'
            });
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
            await connection.rollback();
            // Cleanup any files
            cleanupTempFiles(tempFiles);

            res.status(400).json({
                success: false,
                message: bookingResult.message
            });
            return;
        }

        if (!bookingResult.booking) {
            await connection.rollback();
            // Cleanup any files
            cleanupTempFiles(tempFiles);

            res.status(400).json({
                success: false,
                message: 'Internal server error'
            });
            return;
        }

        // Mark token as used   
        await connection.execute(
            `UPDATE email_action_tokens SET used=1, used_at=NOW() WHERE id=?`,
            [tokenData.id]);

        await connection.commit();

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
        await connection.rollback();
        // Cleanup any temporary files
        cleanupTempFiles(tempFiles);

        console.error('Error confirming guest booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm Booking'
        });
    } finally {
        connection.release();
    }
});

export default router;