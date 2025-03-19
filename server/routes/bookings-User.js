/* Router functions regarding bookings for regular users */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/fileUploadMiddleware');
const emailService = require('../utils/emailService');

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
             LIMIT 10`,
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

// Cancel a booking 
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

// Request a booking (user). Handles filter-question answers (and file uploads)
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

        // First, check if the timeslot exists and is available
        const [timeslots] = await connection.execute(
            `SELECT * FROM bookings 
             WHERE id = ? 
             AND booking_type = 'timeslot' 
             AND status = 'available'`,
            [timeslot_id]
        );

        if (timeslots.length === 0) {
            return res.status(404).json({ message: 'Timeslot not found or not available' });
        }

        const timeslot = timeslots[0];

        // Get the infrastructure_id to fetch required questions
        const infrastructure_id = timeslot.infrastructure_id;

        // Fetch all required questions for this infrastructure
        const [requiredQuestions] = await connection.execute(
            `SELECT id FROM infrastructure_questions WHERE infrastructure_id = ? AND is_required = 1`,
            [infrastructure_id]
        );

        // Only validate if there are required questions
        if (requiredQuestions.length > 0) {
            // Extract question IDs for easier checking
            const requiredQuestionIds = requiredQuestions.map(q => q.id);

            // Initialize collection of answers from request
            let answersObj = {};

            // Try to parse answers from different possible formats
            if (req.body.answersJSON) {
                try {
                    answersObj = JSON.parse(req.body.answersJSON);
                } catch (e) {
                    console.error('Error parsing answersJSON:', e);
                }
            }

            // Handle individual answer fields (text/number/dropdown)
            for (const key in req.body) {
                if (key.startsWith('answer_')) {
                    const questionId = parseInt(key.replace('answer_', ''));
                    if (!answersObj[questionId]) {
                        answersObj[questionId] = {
                            type: 'text',
                            value: req.body[key]
                        };
                    }
                }
            }

            // Handle file uploads
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldName = file.fieldname;

                    if (fieldName.startsWith('file_')) {
                        const questionId = parseInt(fieldName.replace('file_', ''));
                        answersObj[questionId] = {
                            type: 'file',
                            filePath: file.path,
                            originalName: file.originalname
                        };
                    }
                }
            }

            // Check if all required questions have valid answers
            const missingAnswers = [];
            for (const qId of requiredQuestionIds) {
                const answer = answersObj[qId];
                const isEmpty = !answer ||
                    (answer.type === 'text' && (!answer.value || answer.value.trim() === '')) ||
                    (answer.type === 'file' && !answer.filePath);

                if (isEmpty) {
                    missingAnswers.push(qId);
                }
            }

            if (missingAnswers.length > 0) {
                // If we have missing answers, rollback the transaction
                await connection.rollback();
                return res.status(400).json({
                    success: false,
                    message: 'All required questions must be answered'
                });
            }
        }

        // Book the timeslot by updating its record
        await connection.execute(
            `UPDATE bookings
             SET booking_type = 'booking',
                 user_email = ?,
                 status = 'pending',
                 purpose = ?
             WHERE id = ?`,
            [userEmail, purpose, timeslot_id]
        );

        // Get the updated booking record for email notification
        const [bookings] = await connection.execute(
            `SELECT * FROM bookings WHERE id = ?`,
            [timeslot_id]
        );

        const booking = bookings[0];

        // Process answers if any (for FormData requests)
        if (req.is('multipart/form-data')) {
            let answersObj = {};

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
                        answersObj[questionId] = {
                            type: 'file',
                            filePath: file.path,
                            originalName: file.originalname
                        };
                    }
                }
            }

            // Process the answers
            for (const [questionId, answerData] of Object.entries(answersObj)) {
                let answerText = null;
                let documentPath = null;

                if (answerData.type === 'file' && answerData.filePath) {
                    // For files, store the path
                    documentPath = answerData.filePath;
                    answerText = answerData.originalName || 'Uploaded file';
                } else if (answerData.type === 'text' && answerData.value) {
                    // For text answers
                    answerText = answerData.value;
                }

                // Save answer to database
                if (answerText !== null || documentPath !== null) {
                    await connection.execute(
                        `INSERT INTO booking_answers 
                         (booking_id, question_id, answer_text, document_path) 
                         VALUES (?, ?, ?, ?)`,
                        [timeslot_id, questionId, answerText, documentPath]
                    );
                }
            }
        }

        // Get infrastructure details
        const [infrastructures] = await connection.execute(
            'SELECT * FROM infrastructures WHERE id = ?',
            [timeslot.infrastructure_id]
        );

        // Get infrastructure managers
        const [managers] = await connection.execute(
            `SELECT u.id, u.name, u.email, u.email_notifications
             FROM users u
             JOIN infrastructure_managers im ON u.id = im.user_id
             WHERE im.infrastructure_id = ?`,
            [timeslot.infrastructure_id]
        );

        // Generate token for email actions
        let actionToken = null;
        try {
            actionToken = await emailService.generateSecureActionToken(booking, connection);
        } catch (tokenError) {
            console.warn('Failed to generate action token:', tokenError);
            // Continue with the process even if token generation fails
        }

        await connection.commit();

        // Send notifications to both managers and user
        // Continue with the API response even on errors.
        if (infrastructures.length > 0 && managers.length > 0) {
            if (!actionToken) {
                console.error("Notification-emails won't be sent because there is no action token");
            }
            else {
                try {
                    await emailService.sendBookingNotifications(
                        booking,
                        infrastructures[0],
                        managers,
                        actionToken
                    );
                } catch (emailError) {
                    console.error('Failed to send notification emails:', emailError);
                }
            }
        }

        res.status(201).json({
            message: 'Booking request submitted successfully',
            booking_id: timeslot_id,
            infrastructure_id: timeslot.infrastructure_id,
            booking_date: timeslot.booking_date,
            start_time: timeslot.start_time,
            end_time: timeslot.end_time
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

// Get available timeslots for an infrastructure with optional date filter (user)
router.get('/:infrastructureId/available-timeslots', authenticateToken, async (req, res) => {
    try {
        const { infrastructureId } = req.params;
        const { date } = req.query;

        let query = `
            SELECT * FROM bookings 
            WHERE infrastructure_id = ? 
            AND booking_type = 'timeslot'
            AND status = 'available'
            AND booking_date >= CURDATE()
        `;

        const params = [infrastructureId];

        // Add date filter if provided
        if (date) {
            query += ' AND booking_date = ?';
            params.push(date);
        }

        query += ' ORDER BY booking_date ASC, start_time ASC';

        const [timeslots] = await pool.execute(query, params);
        res.json(timeslots);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching available timeslots' });
    }
});

module.exports = router;