const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const path = require('path');
const fs = require('fs');
const { authenticateToken } = require('../middleware/authMiddleware');
const { getFilePath, getMimeType } = require('../middleware/fileUploadMiddleware');

/**
 * Secure file download endpoint
 * Handles authorization checks:
 * - Admins can access any file
 * - Managers can access files for infrastructures they manage
 * - Users can only access their own uploads
 */
router.get('/download/:bookingId/:questionId', authenticateToken, async (req, res) => {
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
            return res.status(403).json({ message: 'You do not have permission to access this file' });
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

module.exports = router;