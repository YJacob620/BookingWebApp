/* Router functions regarding bookings for both admins and infrastructure managers */

import express, { Request, Response } from 'express';
import { Pool, PoolConnection, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
const router = express.Router();
import pool from '../configuration/db';
import {
    authenticateAdminOrManager,
    hasInfrastructureAccess
} from '../middleware/authMiddleware';
import emailService from '../utils/emailService';

interface BookingRequestBody {
    infrastructureID: number;
    startDate: string;
    endDate: string;
    dailyStartTime: string;
    slotDuration: number;
    slotsPerDay: number;
}

interface BookingCancelBody {
    ids: number[];
}

interface BookingStatusBody {
    status: 'rejected' | 'canceled';
}

interface Booking extends RowDataPacket {
    id: number;
    infrastructure_id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: string;
    booking_type: string;
    user_email: string | null;
}

interface Infrastructure extends RowDataPacket {
    id: number;
    name: string;
    location: string;
}

interface TimeslotOverlap extends RowDataPacket {
    count: number;
}

// Create timeslots (admin or manager for their infrastructures)
router.post('/create-timeslots', authenticateAdminOrManager, async (req: Request, res: Response) => {
    const connection: PoolConnection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            infrastructureID,
            startDate,
            endDate,
            dailyStartTime,
            slotDuration,
            slotsPerDay
        }: BookingRequestBody = req.body;

        // Validate input
        if (!infrastructureID) {
            return res.status(400).json({
                message: 'Infrastructure ID is required',
            });
        }
        if (!await hasInfrastructureAccess(req, res, infrastructureID, connection, true)) return;


        if (!startDate) {
            return res.status(400).json({
                message: 'Start date is required',
            });
        }

        if (!endDate) {
            return res.status(400).json({
                message: 'End date is required',
            });
        }

        if (!dailyStartTime) {
            return res.status(400).json({
                message: 'Daily start time is required',
            });
        }

        if (!slotDuration) {
            return res.status(400).json({
                message: 'Slot duration is required',
            });
        }

        if (!slotsPerDay) {
            return res.status(400).json({
                message: 'Number of slots per day is required',
            });
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
                const [overlapping] = await connection.execute<TimeslotOverlap[]>(
                    `SELECT COUNT(*) as count FROM bookings 
                     WHERE infrastructure_id = ? 
                     AND booking_date = ?
                     AND status = 'available'
                     AND ((start_time <= ? AND end_time > ?)
                          OR (start_time < ? AND end_time >= ?)
                          OR (? <= start_time AND ? >= end_time))`,
                    [infrastructureID, currentDate, startTime, startTime, endTime, endTime, startTime, endTime]
                );

                if (overlapping[0].count === 0) {
                    // Create the timeslot
                    await connection.execute(
                        `INSERT INTO bookings (infrastructure_id, booking_date, start_time, end_time, status, booking_type, user_email) 
                         VALUES (?, ?, ?, ?, 'available', 'timeslot', NULL)`,
                        [infrastructureID, currentDate, startTime, endTime]
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

// Cancel timeslots (admin or manager for their infrastructures)
router.delete('/timeslots', authenticateAdminOrManager, async (req: Request, res: Response) => {
    try {
        const { ids }: BookingCancelBody = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No timeslots specified for cancellation' });
        }

        // Get the infrastructure IDs for the timeslots
        const placeholders = ids.map(() => '?').join(',');
        const [timeslots] = await pool.execute<Booking[]>(
            `SELECT id, infrastructure_id FROM bookings WHERE id IN (${placeholders})`,
            ids
        );

        // Check access for each infrastructure
        for (const timeslot of timeslots) {
            if (!await hasInfrastructureAccess(req, res, timeslot.infrastructure_id)) return;
        }

        // Update status to 'canceled' 
        const [result] = await pool.execute<ResultSetHeader>(
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

// Approve a booking request (admin or responsible manager)
router.put('/:id/approve', authenticateAdminOrManager, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // Get booking details
        const [bookings] = await pool.execute<Booking[]>('SELECT * FROM bookings WHERE id = ?', [id]);

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = bookings[0];

        // Check infrastructure access
        if (!await hasInfrastructureAccess(req, res, booking.infrastructure_id)) return;

        // Update the booking status to approved
        await pool.execute('UPDATE bookings SET status = ? WHERE id = ?', ['approved', id]);

        // Get infrastructure details for email notification
        const [infrastructures] = await pool.execute<Infrastructure[]>(
            'SELECT * FROM infrastructures WHERE id = ?',
            [booking.infrastructure_id]
        );

        // Send email notification to user
        if (infrastructures.length > 0) {
            try {
                await emailService.sendBookingStatusUpdate(
                    booking,
                    infrastructures[0],
                    'approved'
                );
            } catch (emailError) {
                console.error('Error sending booking approval notification:', emailError);
                // Continue even if email fails - don't block the API response
            }
        }

        res.json({ message: 'Booking approved successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error approving booking' });
    }
});

// Reject or cancel a booking request / approved booking (admin or responsible manager) 
// This will also create a new available timeslot at the time of the old booking.
router.put('/:id/reject-or-cancel', authenticateAdminOrManager, async (req: Request, res: Response) => {
    const connection: PoolConnection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const { id } = req.params;
        const { status }: BookingStatusBody = req.body;

        // Validate status
        if (status !== 'rejected' && status !== 'canceled') {
            return res.status(400).json({ message: 'Invalid status. Must be "rejected" or "canceled"' });
        }

        // Get booking details
        const [bookings] = await connection.execute<Booking[]>(
            'SELECT * FROM bookings WHERE id = ?',
            [id]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking = bookings[0];
        if (!await hasInfrastructureAccess(req, res, booking.infrastructure_id, connection, true)) return;

        // Get infrastructure details for email notification (before we execute the procedure)
        const [infrastructures] = await connection.execute<Infrastructure[]>(
            'SELECT * FROM infrastructures WHERE id = ?',
            [booking.infrastructure_id]
        );

        // Call the stored procedure for rejecting or canceling
        await connection.execute(
            'CALL AdminRejectOrCancelBooking(?, ?)',
            [id, status]
        );

        await connection.commit();

        // Send email notification to user after the transaction is committed
        if (infrastructures.length > 0) {
            try {
                await emailService.sendBookingStatusUpdate(
                    booking,
                    infrastructures[0],
                    status
                );
            } catch (emailError) {
                console.error(`Error sending booking ${status} notification:`, emailError);
                // Continue even if email fails - don't block the API response
            }
        }

        res.json({
            message: `Booking ${status} successfully`
        });

    } catch (err) {
        await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({ message: `Error ${req.body.status === 'rejected' ? 'rejecting' : 'canceling'} booking` });
    } finally {
        connection.release();
    }
});

// Force update of all booking and timeslot statuses (admin only)
router.post('/force-bookings-status-update', authenticateAdminOrManager, async (req: Request, res: Response) => {
    try {
        // Call the stored procedure directly
        await pool.execute('CALL update_past_statuses()');

        // Return a simple success response
        res.json({
            message: 'Status update forced successfully'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error updating statuses' });
    }
});

interface QueryParams {
    startDate?: string;
    endDate?: string;
    limit?: string;
}

// Get all entries (both bookings and timeslots) for an infrastructure
router.get('/:infrastructureId/all-entries', authenticateAdminOrManager, async (req: Request, res: Response) => {
    try {
        const { infrastructureId } = req.params;
        if (!await hasInfrastructureAccess(req, res, infrastructureId)) return;

        const { startDate, endDate, limit } = req.query as QueryParams;

        // Join with users table to get user roles for bookings and infrastructure info
        let query = `
            SELECT b.*, 
                   u.role as user_role,
                   i.name as infrastructure_name,
                   i.location as infrastructure_location
            FROM bookings b
            LEFT JOIN users u ON b.user_email = u.email
            JOIN infrastructures i ON b.infrastructure_id = i.id
            WHERE b.infrastructure_id = ?
        `;

        const params: any[] = [infrastructureId];

        // Add date range filter if provided (keep minimal server-side filtering)
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

        // Order by date and time for consistent display
        query += ' ORDER BY b.booking_date DESC, b.start_time ASC';

        // Add limit if specified (for pagination support)
        if (limit && !isNaN(parseInt(limit))) {
            query += ' LIMIT ?';
            params.push(parseInt(limit));
        }

        const [entries] = await pool.execute(query, params);
        res.json(entries);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching booking entries' });
    }
});

export default router;