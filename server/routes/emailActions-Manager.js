const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const emailService = require('../utils/emailService');

// Process email approval/rejection links
router.get('/:action/:token', async (req, res) => {
    const { action, token } = req.params;

    if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ message: 'Invalid action' });
    }

    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Find and validate the token
        const [tokens] = await connection.execute(
            'SELECT * FROM email_action_tokens WHERE token = ? AND used = 0 AND expires > NOW()',
            [token]
        );

        if (tokens.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const tokenRecord = tokens[0];

        // Get booking details
        const [bookings] = await connection.execute(
            'SELECT * FROM bookings WHERE id = ?',
            [tokenRecord.booking_id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = bookings[0];

        // Check if booking status is still pending (hasn't been already processed)
        if (booking.status !== 'pending') {
            // Mark token as used since it can't be used anymore
            await connection.execute(
                'UPDATE email_action_tokens SET used = 1, used_at = NOW() WHERE id = ?',
                [tokenRecord.id]
            );

            await connection.commit();

            // Redirect to a page indicating status already changed
            return res.redirect(`${process.env.FRONTEND_URL}/email-action-confirmation?action=${action}&status=already-processed&current=${booking.status}`);
        }

        // Process the action
        if (action === 'approve') {
            // Approve booking
            await connection.execute(
                'UPDATE bookings SET status = "approved" WHERE id = ?',
                [booking.id]
            );
        } else {
            // Reject booking
            await connection.execute(
                'CALL AdminRejectOrCancelBooking(?, ?)',
                [booking.id, 'rejected']
            );
        }

        // Mark token as used
        await connection.execute(
            'UPDATE email_action_tokens SET used = 1, used_at = NOW() WHERE id = ?',
            [tokenRecord.id]
        );

        // Get infrastructure details
        const [infrastructures] = await connection.execute(
            'SELECT * FROM infrastructures WHERE id = ?',
            [booking.infrastructure_id]
        );

        // Send notification to user
        if (infrastructures.length > 0) {
            await emailService.sendBookingStatusUpdate(
                booking,
                infrastructures[0],
                action === 'approve' ? 'approved' : 'rejected'
            );
        }

        await connection.commit();

        // Redirect to confirmation page
        // res.redirect(`${process.env.FRONTEND_URL}/email-action-confirmation?action=${action}&status=success`);
    } catch (error) {
        await connection.rollback();
        console.error('Error processing email action:', error);
        // res.redirect(`${process.env.FRONTEND_URL}/email-action-confirmation?action=${action}&status=error`);
    } finally {
        connection.release();
        res.send(`
            <html>
              <body>
                <script>
                  window.close();
                </script>
              </body>
            </html>
          `);
    }
});

module.exports = router;