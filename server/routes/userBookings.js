const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get recent bookings for the current user
router.get('/user', authenticateToken, async (req, res) => {
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
router.get('/user/all', authenticateToken, async (req, res) => {
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

// Cancel a booking (user can cancel their own pending or approved bookings not within 24 hours)
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

// Request a booking (user) - JSON version
router.post('/request', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { timeslot_id, purpose } = req.body;
        const userEmail = req.user.email;

        if (!timeslot_id) {
            return res.status(400).json({ message: 'Timeslot ID is required' });
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
        const approveToken = await emailService.generateSecureActionToken(result, 'approve');

        // Send notification email to managers
        if (infrastructures.length > 0 && managers.length > 0) {
            await emailService.sendBookingRequestNotification(
                result,
                infrastructures[0],
                managers,
                approveToken
            );
        }

        await connection.commit();

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
        res.status(500).json({ message: 'Error creating booking request', error: err.message });
    } finally {
        connection.release();
    }
});

// Request a booking with additional answers and file uploads (user)
router.post('/request-with-answers', authenticateToken, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Use multer or similar middleware to handle file uploads
        // For this implementation, we'll assume formidable or similar is configured

        const { timeslot_id, purpose, answers } = req.body;
        const userEmail = req.user.email;

        if (!timeslot_id) {
            return res.status(400).json({ message: 'Timeslot ID is required' });
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

        // Book the timeslot by updating its record
        const [result] = await connection.execute(
            `UPDATE bookings
             SET booking_type = 'booking',
                 user_email = ?,
                 status = 'pending',
                 purpose = ?
             WHERE id = ?`,
            [userEmail, purpose, timeslot_id]
        );

        // If we have answers, save them to the database
        if (answers && Object.keys(answers).length > 0) {
            // Process each answer
            for (const [questionId, answer] of Object.entries(answers)) {
                // For files, handle upload and save path
                let answerText = null;
                let documentPath = null;

                if (answer instanceof File) {
                    // Save file to filesystem and store path
                    documentPath = `/uploads/${Date.now()}_${answer.name}`;
                    // Here you'd implement file saving logic
                } else {
                    answerText = answer?.toString() || null;
                }

                // Save answer to database
                await connection.execute(
                    `INSERT INTO booking_answers 
                     (booking_id, question_id, answer_text, document_path) 
                     VALUES (?, ?, ?, ?)`,
                    [timeslot_id, questionId, answerText, documentPath]
                );
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
        const approveToken = await emailService.generateSecureActionToken(result, 'approve');

        // Send notification email to managers
        if (infrastructures.length > 0 && managers.length > 0) {
            await emailService.sendBookingRequestNotification(
                result,
                infrastructures[0],
                managers,
                approveToken
            );
        }

        await connection.commit();

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
        res.status(500).json({ message: 'Error creating booking request', error: err.message });
    } finally {
        connection.release();
    }
});

module.exports = router;