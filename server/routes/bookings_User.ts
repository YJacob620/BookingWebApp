import express, { Request, Response } from 'express';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/fileUploadMiddleware';
import pool from '../configuration/db';
import emailService from '../utils/emailService'
import {
    processBookingRequest,
    parseBookingRequest,
    trackTempFiles,
    handleBookingError
} from '../utils';
const router = express.Router();


// Get recent bookings for the current user
router.get('/recent', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userEmail = req.user!.email;

        const [bookings]: any[] = await pool.execute(
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
router.get('/all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userEmail = req.user!.email;

        const [bookings]: any[] = await pool.execute(
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
router.post('/:id/cancel', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const userEmail = req.user!.email;

        const [bookings]: any[] = await pool.execute(
            `SELECT * FROM bookings 
             WHERE id = ? 
             AND user_email = ? 
             AND booking_type = 'booking'`,
            [id, userEmail]
        );

        if (bookings.length === 0) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        const booking: any = bookings[0];

        if (booking.status !== 'pending' && booking.status !== 'approved') {
            res.status(400).json({ message: 'Only pending or approved bookings can be canceled by the user' });
            return;
        }

        const bookingDateTime: Date = new Date(`${booking.booking_date}T${booking.start_time}`);
        const now: Date = new Date();
        const differenceInHours: number = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (differenceInHours <= 24) {
            res.status(400).json({ message: 'Bookings within 24 hours cannot be canceled' });
            return;
        }

        // Execute the stored procedure for booking cancelation
        await pool.execute(
            'CALL UserCancelBooking(?, ?, @success, @message)',
            [id, userEmail]
        );
        const [resultSet]: any[] = await pool.execute('SELECT @success as success, @message as message');
        const result = resultSet[0];
        if (!result.success) {
            res.status(400).json({ message: result.message || 'Failed to cancel booking' });
            return;
        }
        res.json({ message: result.message || 'Booking canceled successfully' });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error canceling booking' });
    }
});

// Request a booking (user)
router.post('/request', authenticateToken, upload.any(), async (req: Request, res: Response): Promise<void> => {
    const connection = await pool.getConnection();
    let tempFiles: string[] = [];

    try {
        await connection.beginTransaction();

        const userEmail = req.user!.email;

        // Parse booking request
        const parsedRequest = parseBookingRequest(req);

        if (!parsedRequest.valid) {
            res.status(400).json({
                success: false,
                message: parsedRequest.error
            });
            return;
        }

        // Track uploaded files for potential cleanup
        tempFiles = trackTempFiles(req);

        // Process booking request
        const bookingResult = await processBookingRequest(connection, {
            email: userEmail,
            timeslotId: parsedRequest.timeslotId,
            purpose: parsedRequest.purpose,
            answers: parsedRequest.answers
        });

        if (!bookingResult.success) {
            await handleBookingError(connection, tempFiles, res, 400, bookingResult.message);
            return;
        }

        await connection.commit();

        // Send notifications
        if (bookingResult.infrastructure && bookingResult.managers.length > 0 && bookingResult.actionToken) {
            try {
                await emailService.sendBookingNotifications(
                    bookingResult.booking,
                    bookingResult.infrastructure,
                    bookingResult.managers,
                    bookingResult.actionToken);
            } catch (emailError) {
                console.error('Failed to send notification emails:', emailError);
            }
        }

        // Once the transaction is committed successfully, we don't want to delete 
        // files that have been properly moved
        tempFiles = [];

        res.status(201).json({
            success: true,
            message: 'Booking request submitted successfully',
            booking_id: parsedRequest.timeslotId,
            infrastructure_id: bookingResult.booking!.infrastructure_id,
            booking_date: bookingResult.booking!.booking_date,
            start_time: bookingResult.booking!.start_time,
            end_time: bookingResult.booking!.end_time
        });
    } catch (err) {
        await handleBookingError(connection, tempFiles, res, 500, 'Error creating booking request');
    } finally {
        connection.release();
    }
});

export default router;