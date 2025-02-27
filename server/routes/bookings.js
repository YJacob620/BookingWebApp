const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, verifyAdmin } = require('../middleware/authMiddleware');

// Create timeslots (admin only)
router.post('/create-timeslots', authenticateToken, verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            infrastructure_id,
            startDate,
            endDate,
            dailyStartTime,
            slotDuration,
            slotsPerDay
        } = req.body;

        // Validate input
        if (!infrastructure_id || !startDate || !endDate || !dailyStartTime || !slotDuration || !slotsPerDay) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            return res.status(400).json({ message: 'Start date cannot be in the past' });
        }
        if (end < start) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        let created = 0;
        let skipped = 0;

        // Process each day
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const currentDate = date.toISOString().split('T')[0];
            let currentTime = new Date(`${currentDate}T${dailyStartTime}`);

            // Create slots for each day
            for (let slot = 0; slot < slotsPerDay; slot++) {
                const startTime = currentTime.toTimeString().slice(0, 5);
                currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
                const endTime = currentTime.toTimeString().slice(0, 5);

                // Check for overlaps
                const [overlapping] = await connection.execute(
                    `SELECT COUNT(*) as count FROM bookings 
                     WHERE infrastructure_id = ? 
                     AND booking_date = ?
                     AND status = 'available'
                     AND ((start_time <= ? AND end_time > ?)
                          OR (start_time < ? AND end_time >= ?)
                          OR (? <= start_time AND ? >= end_time))`,
                    [infrastructure_id, currentDate, startTime, startTime, endTime, endTime, startTime, endTime]
                );

                if (overlapping[0].count === 0) {
                    // Create the timeslot
                    await connection.execute(
                        `INSERT INTO bookings (infrastructure_id, booking_date, start_time, end_time, status, booking_type, user_email) 
                         VALUES (?, ?, ?, ?, 'available', 'timeslot', NULL)`,
                        [infrastructure_id, currentDate, startTime, endTime]
                    );
                    created++;
                } else {
                    skipped++;
                }
            }
        }

        await connection.commit();
        res.status(201).json({
            message: 'Timeslots created successfully',
            created,
            skipped
        });

    } catch (err) {
        await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error creating timeslots' });
    } finally {
        connection.release();
    }
});

// Cancel timeslots (admin only)
router.delete('/timeslots', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No timeslots specified for cancellation' });
        }

        // Update status to 'canceled' instead of deleting
        const placeholders = ids.map(() => '?').join(',');
        const [result] = await pool.execute(
            `UPDATE bookings 
             SET status = 'canceled'
             WHERE id IN (${placeholders}) AND booking_type = 'timeslot'`,
            ids
        );

        res.json({
            message: 'Timeslots canceled successfully',
            canceled: result.affectedRows
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error canceling timeslots' });
    }
});

// Update booking status (admin only)
router.put('/:id/booking-status', authenticateToken, verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { status } = req.body;

        // Validate status
        const validStatuses = ['pending', 'approved', 'rejected', 'completed', 'expired', 'canceled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        // Get booking details
        const [bookings] = await connection.execute(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = bookings[0];

        // Update the booking status
        await connection.execute(
            'UPDATE bookings SET status = ? WHERE id = ?',
            [status, id]
        );

        let rejectedCount = 0;

        // If approving, reject all other pending bookings for the same timeslot
        if (status === 'approved') {
            const [result] = await connection.execute(
                `UPDATE bookings 
                 SET status = 'rejected' 
                 WHERE id != ? 
                 AND infrastructure_id = ? 
                 AND booking_date = ? 
                 AND start_time = ? 
                 AND end_time = ? 
                 AND status = 'pending'`,
                [id, booking.infrastructure_id, booking.booking_date, booking.start_time, booking.end_time]
            );

            rejectedCount = result.affectedRows;
        }

        await connection.commit();

        res.json({
            message: `Booking status updated to ${status}`,
            rejectedCount
        });

    } catch (err) {
        await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error updating booking status' });
    } finally {
        connection.release();
    }
});

// Force update of all booking and timeslot statuses (admin only)
router.post('/force-bookings-status-update', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        // Call the stored procedure directly
        const [result] = await pool.execute('CALL update_past_statuses()');

        // Extract counts from the result (the procedure returns a result set)
        const updateResult = result[0][0];

        // Parse the result string into count values
        const resultString = updateResult.result;

        // Use regex to extract the counts from the concatenated string
        const completedMatch = resultString.match(/(\d+) bookings marked as completed/);
        const expiredBookingsMatch = resultString.match(/(\d+) bookings marked as expired/);
        const expiredTimeslotsMatch = resultString.match(/(\d+) timeslots marked as expired/);

        const completedCount = completedMatch ? parseInt(completedMatch[1]) : 0;
        const expiredBookingsCount = expiredBookingsMatch ? parseInt(expiredBookingsMatch[1]) : 0;
        const expiredTimeslotsCount = expiredTimeslotsMatch ? parseInt(expiredTimeslotsMatch[1]) : 0;

        res.json({
            message: 'Status update forced successfully',
            completedCount,
            expiredBookingsCount,
            expiredTimeslotsCount,
            totalUpdated: completedCount + expiredBookingsCount + expiredTimeslotsCount
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error updating statuses' });
    }
});

// Get all bookings for an infrastructure (admin only). Can be within a specified date range.
router.get('/:infrastructureId/all-bookings', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { infrastructureId } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT b.*, u.role as user_role
            FROM bookings b
            LEFT JOIN users u ON b.user_email = u.email
            WHERE b.infrastructure_id = ? 
            AND b.booking_type = 'booking'
        `;

        const params = [infrastructureId];

        // Add date range filter if provided
        if (startDate && endDate) {
            query += ' AND b.booking_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            query += ' AND b.booking_date >= ?';
            params.push(startDate);
        } else if (endDate) {
            query += ' AND b.booking_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY b.booking_date ASC, b.start_time ASC';

        const [bookings] = await pool.execute(query, params);
        res.json(bookings);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching bookings' });
    }
});

// Get all timeslots for an infrastructure (admin only). Can be within a specified date range.
router.get('/:infrastructureId/all-timeslots', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { infrastructureId } = req.params;
        const { startDate, endDate } = req.query;

        let query = `
            SELECT * FROM bookings 
            WHERE infrastructure_id = ? 
            AND booking_type = 'timeslot'
        `;

        const params = [infrastructureId];

        // Add date range filter if provided
        if (startDate && endDate) {
            query += ' AND booking_date BETWEEN ? AND ?';
            params.push(startDate, endDate);
        } else if (startDate) {
            query += ' AND booking_date >= ?';
            params.push(startDate);
        } else if (endDate) {
            query += ' AND booking_date <= ?';
            params.push(endDate);
        }

        query += ' ORDER BY booking_date ASC, start_time ASC';

        const [timeslots] = await pool.execute(query, params);
        res.json(timeslots);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching timeslots' });
    }
});

// Get available timeslots for an infrastructure with optional date filter (admin and user). 
// Can be within a specified date range.
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