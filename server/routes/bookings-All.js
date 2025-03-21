const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const {
    authenticateToken,
    hasInfrastructureAccess } = require('../middleware/authMiddleware');
const { getMimeType } = require('../middleware/fileUploadMiddleware');

/**
 * Secure file download endpoint
 * Handles authorization checks:
 * - Admins can access any file
 * - Managers can access files for infrastructures they manage
 * - Users can only access their own uploads
 */
router.get('/download-file/:bookingId/:questionId', authenticateToken, async (req, res) => {
    const { bookingId, questionId } = req.params;
    const userId = req.user.userId;
    const userRole = req.user.role;
    const userEmail = req.user.email;

    try {
        // Get the booking details to check permissions
        const [bookings] = await pool.execute(
            'SELECT b.*, i.id as infrastructure_id FROM bookings b JOIN infrastructures i ON b.infrastructure_id = i.id WHERE b.id = ?',
            [bookingId]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = bookings[0];

        // Check permissions based on role
        let hasAccess = false;

        if (userRole === 'admin') {
            // Admins can access any file
            hasAccess = true;
        } else if (userRole === 'manager') {
            // Managers can access files for infrastructures they manage
            const [managerInfras] = await pool.execute(
                'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
                [userId, booking.infrastructure_id]
            );
            hasAccess = managerInfras.length > 0;
        } else {
            // Regular users can only access their own files
            hasAccess = booking.user_email === userEmail;
        }

        if (!hasAccess) {
            return res.status(403).json({ message: 'Forbidden access' });
        }

        // Get the file details
        const [answers] = await pool.execute(
            'SELECT * FROM booking_answers WHERE booking_id = ? AND question_id = ?',
            [bookingId, questionId]
        );

        if (answers.length === 0 || !answers[0].document_path) {
            return res.status(404).json({ message: 'File not found' });
        }

        const filePath = answers[0].document_path;
        const originalFilename = answers[0].answer_text || 'download';

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File not found on server' });
        }

        // Get file mimetype based on extension
        const mimetype = getMimeType(filePath);

        // Set headers for file download
        res.setHeader('Content-Type', mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`);

        // Stream the file to the response
        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
});

/**
 * Combined endpoint to get booking details with question answers
 * Supports both admin/manager access and user access to their own bookings
 */
router.get('/:id/details', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const userEmail = req.user.email;
        const userRole = req.user.role;

        // Different SQL based on user role to optimize the query
        let bookingQuery;
        let params;

        if (userRole === 'admin' || userRole === 'manager') {
            // Admin/Manager query (can access any booking they have permission for)
            bookingQuery = `
                SELECT b.*, 
                    i.name as infrastructure_name, 
                    i.location as infrastructure_location,
                    u.name as user_name
                FROM bookings b
                JOIN infrastructures i ON b.infrastructure_id = i.id
                LEFT JOIN users u ON b.user_email = u.email
                WHERE b.id = ?
            `;
            params = [id];
        } else {
            // Regular user query (can only access their own bookings)
            bookingQuery = `
                SELECT b.*, 
                    i.name as infrastructure_name, 
                    i.location as infrastructure_location
                FROM bookings b
                JOIN infrastructures i ON b.infrastructure_id = i.id
                WHERE b.id = ? AND b.user_email = ?
            `;
            params = [id, userEmail];
        }

        // Execute the appropriate query
        const [bookings] = await pool.execute(bookingQuery, params);

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found or unauthorized' });
        }

        const booking = bookings[0];

        // For admin/manager, verify infrastructure access permission
        if ((userRole === 'admin' || userRole === 'manager') &&
            !await hasInfrastructureAccess(req, res, booking.infrastructure_id)) {
            return; // The hasInfrastructureAccess function will handle the response
        }

        // Get filter questions and answers
        const [answers] = await pool.execute(
            `SELECT 
                q.id as question_id,
                q.question_text,
                q.question_type,
                a.answer_text,
                a.document_path
            FROM infrastructure_questions q
            LEFT JOIN booking_answers a ON q.id = a.question_id AND a.booking_id = ?
            WHERE q.infrastructure_id = ?
            ORDER BY q.display_order`,
            [id, booking.infrastructure_id]
        );

        // Format document paths into URLs if present
        const formattedAnswers = answers.map(answer => {
            if (answer.document_path) {
                // Create URL path for document downloads
                answer.document_url = `${process.env.BACKEND_URL}/bookings/download-files/${id}/${answer.question_id}`;

                // Remove the physical path as it shouldn't be exposed to clients
                delete answer.document_path;
            }
            return answer;
        });

        // Return booking with answers
        res.json({
            booking,
            answers: formattedAnswers
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching booking details' });
    }
});

module.exports = router;