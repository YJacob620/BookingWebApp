import express, { Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import emailService from '../utils/emailService';
import argon2 from 'argon2';
import crypto from 'crypto';
import { processBookingRequest } from '../utils/bookingRequestUtil';

const router = express.Router();
import pool from '../configuration/db';

// Handle guest booking request initiation
router.post('/request', async (req: Request, res: Response): Promise<void> => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { email, name, infrastructureId, timeslotId, purpose = '', answers = {} }:
            { email: string; name: string; infrastructureId: number; timeslotId: number; purpose?: string; answers?: Record<string, any>; } = req.body;

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

        const [timeslots]: [Array<any>] = await connection.execute(
            'SELECT * FROM bookings WHERE id = ? AND booking_type = "timeslot" AND status = "available"',
            [timeslotId]
        );

        if (timeslots.length === 0) {
            await connection.rollback();
            res.status(404).json({
                success: false,
                message: 'Timeslot not found or not available'
            });
            return;
        }

        const today: string = new Date().toISOString().split('T')[0];
        const [existingBookings]: [Array<{ count: number }>] = await connection.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE user_email = ? AND booking_date = ? 
             AND booking_type = 'booking' AND status != 'canceled'`,
            [email, today]
        );

        if (existingBookings[0].count > 0) {
            await connection.rollback();
            res.status(429).json({
                success: false,
                message: 'You have already made a booking today. Please try again tomorrow.'
            });
            return;
        }

        const [users]: [Array<any>] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        let userId: number;

        if (users.length === 0) {
            const tempPassword: string = crypto.randomBytes(16).toString('hex');
            const passwordHash: string = await argon2.hash(tempPassword);

            const [result]: [{ insertId: number }] = await connection.execute(
                `INSERT INTO users (email, password_hash, name, role, is_verified) 
                 VALUES (?, ?, ?, 'guest', 0)`,
                [email, passwordHash, name]
            );

            userId = result.insertId;
        } else {
            userId = users[0].id;

            if (users[0].role !== 'guest') {
                await connection.rollback();
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

        const bookingToken: string = crypto.randomBytes(32).toString('hex');
        const expires: Date = new Date();
        expires.setHours(expires.getHours() + 24);

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
                    answers,
                    userId
                })
            ]
        );

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

    try {
        await connection.beginTransaction();

        const { token }: { token: string } = req.params;

        const [tokens]: [Array<any>] =
            await connection.execute(
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

        const tokenData: any = tokens[0];
        const metadata: any = JSON.parse(tokenData.metadata || '{}');

        if (metadata.type !== 'guest_booking') {
            await connection.rollback();
            res.status(400).json({
                success: false,
                message: 'Invalid token type'
            });
            return;
        }

        const today: string = new Date().toISOString().split('T')[0];
        const [existingBookings]: [Array<{ count: number }>] = await connection.execute(
            `SELECT COUNT(*) as count FROM bookings 
           WHERE user_email=? AND booking_date=? 
           AND booking_type='booking' AND status!='canceled'`,
            [metadata.email, today]
        );

        if (existingBookings[0].count > 0) {
            await connection.rollback();
            res.status(429).json({
                success: false,
                message: 'You have already made a booking today. Please try again tomorrow.'
            });
            return;
        }

        // Use the shared utility function to process the booking
        const bookingResult = await processBookingRequest(connection, {
            email: metadata.email,
            timeslotId: tokenData.booking_id,
            purpose: metadata.purpose || '',
            answers: metadata.answers || {},
            skipAnswerValidation: true
        });

        if (!bookingResult.success) {
            await connection.rollback();
            res.status(400).json({
                success: false,
                message: bookingResult.message
            });
            return;
        }

        // Mark token as used   
        await connection.execute(`UPDATE	email_action_tokens	SET used=1 ,used_at=NOW()	WHERE	id=?`,
            [tokenData.id]);

        await connection.commit();

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