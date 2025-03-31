import express, { Request, Response } from 'express';
import { Pool } from 'mysql2/promise';
import { authenticateToken } from '../middleware/authMiddleware';
import { upload } from '../middleware/fileUploadMiddleware';
import { processBookingRequest } from '../utils/bookingRequestUtil';

const router = express.Router();
const pool: Pool = require('../config/db');

// Get recent bookings for the current user
router.get('/recent', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userEmail: string = req.user.email;

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
        const userEmail: string = req.user.email;

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
        const { id }: { id: string } = req.params;
        const userEmail: string = req.user.email;

        const [bookings]: any[] = await pool.execute(
            `SELECT * FROM bookings 
             WHERE id = ? 
             AND user_email = ? 
             AND booking_type = 'booking'`,
            [id, userEmail]
        );

        if (bookings.length === 0) {
            return res.status(404).json({ message: 'Booking not found' });
        }

        const booking: any = bookings[0];

        if (booking.status !== 'pending' && booking.status !== 'approved') {
            return res.status(400).json({
                message: 'Only pending or approved bookings can be canceled by the user'
            });
        }

        const bookingDateTime: Date = new Date(`${booking.booking_date}T${booking.start_time}`);
        const now: Date = new Date();
        const differenceInHours: number = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (differenceInHours <= 24) {
            return res.status(400).json({
                message: 'Bookings within 24 hours cannot be canceled'
            });
        }

        const [results]: any[] = await pool.execute(
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
router.post('/request', authenticateToken, upload.any(), async (req: Request, res: Response): Promise<void> => {
    const connection: any = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const userEmail: string = req.user.email;
        const timeslot_id: string = req.body.timeslot_id;
        const purpose: string = req.body.purpose || '';

        if (!userEmail || !timeslot_id) {
            return res.status(400).json({
                message: 'Missing required parameters for request',
                receivedBody: JSON.stringify(req.body)
            });
        }

        let answersObj: { [key: string]: any } = {};
        if (req.is('multipart/form-data')) {
            if (req.body.answersJSON) {
                try {
                    answersObj = JSON.parse(req.body.answersJSON);
                } catch (e) {
                    console.error('Error parsing answersJSON:', e);
                }
            }

            for (const key in req.body) {
                if (key.startsWith('answer_')) {
                    const questionId: string = key.replace('answer_', '');
                    answersObj[questionId] = {
                        type: 'text',
                        value: req.body[key]
                    };
                }
            }

            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    const fieldName: string = file.fieldname;

                    if (fieldName.startsWith('file_')) {
                        const questionId: string = fieldName.replace('file_', '');

                        answersObj[questionId] = {
                            type: 'file',
                            filePath: file.path,
                            originalName: file.originalname
                        };

                        console.log(`File uploaded:${file.originalname} -> ${file.path}`);
                    }
                }
            }
        }

        const bookingResult: any = await processBookingRequest(connection, {
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

export default router;