const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/fileUploadMiddleware');
const emailService = require('../utils/emailService');
const path = require('path');
const { processBookingRequest } = require('../utils/bookingRequestUtil');

// Get recent bookings for the current user
router.get('/recent', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Get recent bookings with infrastructure details
        const [bookings] = await pool.execute(
            `SELECT b.*, i.name as infrastructure_name, i.location as infrastructure_location
             FROM bookings b
             JOIN infrastructures i ON b.infrastructure_id = i.id
             WHERE b.user_email = ?
             AND b.booking_type = 'booking'
             ORDER BY b.booking_date DESC, b.start_time DESC
             LIMIT 5`,
            [userEmail]
        );

        res.json(bookings);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching user bookings' });
    }
});

// Get all bookings for the current user
router.get('/all', authenticateToken, async (req, res) => {
    try {
        const userEmail = req.user.email;

        // Get all bookings with infrastructure details
        const [bookings] = await pool.execute(
            `SELECT b.*, i.name as infrastructure_name, i.location as infrastructure_location
             FROM bookings b
             JOIN infrastructures i ON b.infrastructure_id = i.id
             WHERE b.user_email = ?
             AND b.booking_type = 'booking'
             ORDER BY b.booking_date DESC, b.start_time DESC`,
            [userEmail]
        );

        res.json(bookings);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching user bookings' });
    }
});

// Cancel a booking (user)
// Users can cancel their own pending or approved bookings as long as the bookings aren't within 24 hours
router.post('/:id/cancel', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userEmail = req.user.email;

        // Check if the booking exists and belongs to the user
        const [bookings] = await pool.execute(
            `SELECT * FROM bookings 
             WHERE id = ? 
             AND user_email = ? 
             AND booking_type = 'booking'`,
            [id, userEmail]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = bookings[0];

        // Verify booking can be canceled
        if (booking.status !== 'pending' && booking.status !== 'approved') {
            return res.status(400).json({
                message: 'Only pending or approved bookings can be canceled by the user'
            });
        }

        // Check if within 24 hours
        const bookingDateTime = new Date(`${booking.booking_date}T${booking.start_time}`);
        const now = new Date();
        const differenceInHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (differenceInHours <= 24) {
            return res.status(400).json({
                message: 'Bookings within 24 hours cannot be canceled'
            });
        }

        // Call the stored procedure instead of executing multiple queries
        const [results] = await pool.execute(
            'CALL UserCancelBooking(?, ?, @success, @message)',
            [id, userEmail]
        );

        res.json({ message: 'Booking canceled successfully' });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error canceling booking' });
    }
});

// Request a booking (user)
router.post('/request', authenticateToken, upload.any(), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userEmail = req.user.email;
        let timeslot_id, purpose;

        // Handle both JSON and FormData requests
        if (req.is('multipart/form-data')) {
            // FormData request (with potential file uploads and answers)
            timeslot_id = req.body.timeslot_id;
            purpose = req.body.purpose || '';
        } else {
            // JSON request
            ({ timeslot_id, purpose = '' } = req.body);
        }

        if (!timeslot_id) {
            return res.status(400).json({
                message: 'Timeslot ID is required',
                receivedBody: JSON.stringify(req.body)
            });
        }

        // Process answers from the request
        let answersObj = {};

        // Process FormData case (with file uploads)
        if (req.is('multipart/form-data')) {
            // Try to parse answers from different possible formats
            if (req.body.answersJSON) {
                try {
                    answersObj = JSON.parse(req.body.answersJSON);
                } catch (e) {
                    console.error('Error parsing answersJSON:', e);
                }
            }

            // Handle individual answer fields
            for (const key in req.body) {
                if (key.startsWith('answer_')) {
                    const questionId = key.replace('answer_', '');
                    answersObj[questionId] = {
                        type: 'text',
                        value: req.body[key]
                    };
                }
            }

            // Process files from multer
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldName = file.fieldname;

                    // Extract question ID from field name (format: file_123)
                    if (fieldName.startsWith('file_')) {
                        const questionId = fieldName.replace('file_', '');

                        // Store information about the uploaded file
                        answersObj[questionId] = {
                            type: 'file',
                            filePath: file.path,
                            originalName: file.originalname
                        };

                        console.log(`File uploaded: ${file.originalname} -> ${file.path}`);
                    }
                }
            }
        }

        // Use the shared booking utility function
        const bookingResult = await processBookingRequest(connection, {
            email: userEmail,
            timeslotId: timeslot_id,
            purpose,
            answers: answersObj
        });

        if (!bookingResult.success) {
            await connection.rollback();
            return res.status(400).json({
                success: false,
                message: bookingResult.message
            });
        }

        // Generate token for email actions
        let actionToken = null;
        try {
            actionToken = await emailService.generateSecureActionToken(bookingResult.booking, connection);
        } catch (tokenError) {
            console.warn('Failed to generate action token:', tokenError);
            // Continue with the process even if token generation fails
        }

        await connection.commit();

        // Send notifications
        if (bookingResult.infrastructure && bookingResult.managers.length > 0 && actionToken) {
            try {
                await emailService.sendBookingNotifications(
                    bookingResult.booking,
                    bookingResult.infrastructure,
                    bookingResult.managers,
                    actionToken
                );
            } catch (emailError) {
                console.error('Failed to send notification emails:', emailError);
                // Continue even if emails fail
            }
        }

        res.status(201).json({
            message: 'Booking request submitted successfully',
            booking_id: timeslot_id,
            infrastructure_id: bookingResult.booking.infrastructure_id,
            booking_date: bookingResult.booking.booking_date,
            start_time: bookingResult.booking.start_time,
            end_time: bookingResult.booking.end_time
        });

    } catch (err) {
        await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({
            message: 'Error creating booking request',
            error: err.message,
            stack: err.stack
        });
    } finally {
        connection.release();
    }
});

module.exports = router;