const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const emailService = require('../utils/emailService');
const argon2 = require('argon2'); // For temporary password
const crypto = require('crypto');
const { processBookingRequest } = require('../utils/bookingRequestUtil');

// Handle guest booking request initiation
router.post('/request', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { email, infrastructureId, timeslotId, purpose = '', answers = {} } = req.body;

        if (!email || !infrastructureId || !timeslotId) {
            return res.status(400).json({
                success: false,
                message: 'Email, infrastructure ID, and timeslot ID are required'
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format'
            });
        }

        // Check if timeslot exists and is available
        const [timeslots] = await connection.execute(
            'SELECT * FROM bookings WHERE id = ? AND booking_type = "timeslot" AND status = "available"',
            [timeslotId]
        );

        if (timeslots.length === 0) {
            await connection.rollback();
            return res.status(404).json({
                success: false,
                message: 'Timeslot not found or not available'
            });
        }

        // Check if user has already made a booking today
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        const [existingBookings] = await connection.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE user_email = ? AND booking_date = ? 
             AND booking_type = 'booking' AND status != 'canceled'`,
            [email, today]
        );

        if (existingBookings[0].count > 0) {
            await connection.rollback();
            return res.status(429).json({
                success: false,
                message: 'You have already made a booking today. Please try again tomorrow.'
            });
        }

        // Check if user exists
        const [users] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        let userId;

        if (users.length === 0) {
            // Create a new temporary guest user
            const tempPassword = crypto.randomBytes(16).toString('hex');
            const passwordHash = await argon2.hash(tempPassword);

            const [result] = await connection.execute(
                `INSERT INTO users (email, password_hash, name, role, is_verified) 
                 VALUES (?, ?, ?, 'guest', 0)`,
                [email, passwordHash, `Guest ${email.split('@')[0]}`]
            );

            userId = result.insertId;
        } else {
            userId = users[0].id;

            // If this is a registered non-guest user, don't allow this flow
            if (users[0].role !== 'guest') {
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'This email is already registered. Please login to book.'
                });
            }

            // Update user to ensure role is guest and is_verified is 0
            await connection.execute(
                'UPDATE users SET role = "guest", is_verified = 0 WHERE id = ?',
                [userId]
            );
        }

        // Store booking details temporarily
        // Generate a secure token
        const bookingToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date();
        expires.setHours(expires.getHours() + 24); // 24-hour expiry

        // Store in email_action_tokens with appropriate metadata
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

        // Send verification email with booking link
        const verificationUrl = `${process.env.FRONTEND_URL}/guest-confirm/${bookingToken}`;
        await emailService.sendGuestBookingVerificationEmail(email, verificationUrl);

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
router.get('/confirm-booking/:token', async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const { token } = req.params;

        // Find the token
        const [tokens] = await connection.execute(
            `SELECT * FROM email_action_tokens 
             WHERE token = ? AND used = 0 AND expires > NOW()`,
            [token]
        );

        if (tokens.length === 0) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired booking token'
            });
        }

        const tokenData = tokens[0];
        const metadata = JSON.parse(tokenData.metadata || '{}');

        // Verify this is a guest booking token
        if (metadata.type !== 'guest_booking') {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: 'Invalid token type'
            });
        }

        // Check daily booking limit again (in case they confirmed multiple emails)
        const today = new Date().toISOString().split('T')[0];
        const [existingBookings] = await connection.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE user_email = ? AND booking_date = ? 
             AND booking_type = 'booking' AND status != 'canceled'`,
            [metadata.email, today]
        );

        if (existingBookings[0].count > 0) {
            await connection.rollback();
            return res.status(429).json({
                success: false,
                message: 'You have already made a booking today. Please try again tomorrow.'
            });
        }

        // Use the shared utility function to process the booking
        const bookingResult = await processBookingRequest(connection, {
            email: metadata.email,
            timeslotId: tokenData.booking_id,
            purpose: metadata.purpose || '',
            answers: metadata.answers || {},
            skipAnswerValidation: true // Skip validation since we already validated during initiation
        });

        if (!bookingResult.success) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: bookingResult.message
            });
        }

        // Mark token as used
        await connection.execute(
            'UPDATE email_action_tokens SET used = 1, used_at = NOW() WHERE id = ?',
            [tokenData.id]
        );

        await connection.commit();

        // Generate action token for manager email notifications
        if (bookingResult.infrastructure && bookingResult.managers.length > 0) {
            try {
                // Generate a token for manager email actions
                const actionToken = await emailService.generateSecureActionToken(bookingResult.booking, pool);

                // Send notifications to managers
                await emailService.sendBookingNotifications(
                    bookingResult.booking,
                    bookingResult.infrastructure,
                    bookingResult.managers,
                    actionToken
                );

                // Send confirmation to guest
                await emailService.sendGuestBookingConfirmation(
                    metadata.email,
                    bookingResult.booking,
                    bookingResult.infrastructure
                );
            } catch (emailError) {
                console.error('Failed to send notification emails:', emailError);
                // Continue even if emails fail
            }
        }

        // Return HTML response for browser
        res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Booking Confirmed</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        background-color: #1a1a1a;
                        color: #e0e0e0;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        height: 100vh;
                        margin: 0;
                        text-align: center;
                    }
                    .card {
                        background-color: #2a2a2a;
                        border-radius: 8px;
                        padding: 40px;
                        box-shadow: 0 4px 8px rgba(0,0,0,0.2);
                        max-width: 500px;
                    }
                    h1 {
                        color: #4CAF50;
                    }
                    .button {
                        background-color: #3a66dd;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        text-decoration: none;
                        margin-top: 20px;
                        display: inline-block;
                    }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>Booking Confirmed!</h1>
                    <p>Your booking request has been submitted successfully.</p>
                    <p>You will receive an email notification when the infrastructure manager reviews your request.</p>
                    <a href="${process.env.FRONTEND_URL}" class="button">Return to Website</a>
                </div>
            </body>
            </html>
        `);
    } catch (error) {
        await connection.rollback();
        console.error('Error confirming guest booking:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to confirm booking'
        });
    } finally {
        connection.release();
    }
});

module.exports = router;