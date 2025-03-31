import express, { Request, Response } from 'express';
import fs from 'fs';

import { authenticateToken, hasInfrastructureAccess } from '../middleware/authMiddleware';
import { getMimeType } from '../middleware/fileUploadMiddleware';
import pool from '../configuration/db';
const router = express.Router();

router.get('/download-file/:bookingId/:questionId', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    const bookingId = req.params.bookingId;
    const questionId = req.params.questionId;
    const userEmail = req.user!.email;

    try {
        const [bookings]: any[] = await pool.execute(
            'SELECT b.*, i.id as infrastructure_id FROM bookings b JOIN infrastructures i ON b.infrastructure_id = i.id WHERE b.id = ?',
            [bookingId]
        );

        if (bookings.length === 0) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        const booking: any = bookings[0];

        if (!await hasInfrastructureAccess(req, res, booking.infrastructure_id, undefined, false, false)) {
            if (!(booking.user_email === userEmail)) {
                res.status(403).json({ message: 'Forbidden access' });
                return;
            }
        }

        const [answers]: any[] = await pool.execute(
            'SELECT * FROM booking_answers WHERE booking_id = ? AND question_id = ?',
            [bookingId, questionId]
        );

        if (answers.length === 0 || !answers[0].document_path) {
            res.status(404).json({ message: 'File not found' });
            return;
        }

        const filePath: string = answers[0].document_path;
        const originalFilename: string = answers[0].answer_text || 'download';

        if (!fs.existsSync(filePath)) {
            res.status(404).json({ message: 'File not found on server' });
            return;
        }

        const mimetype: string = getMimeType(filePath);

        res.setHeader('Content-Type', mimetype);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`);

        const fileStream = fs.createReadStream(filePath);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ message: 'Error downloading file' });
    }
});

router.get('/:id/details', authenticateToken, async (req: Request, res: Response): Promise<void> => {
    try {
        const userEmail = req.user!.email;
        const id = req.params.id;

        // Get the booking with its infrastructure ID
        const [bookings]: any[] = await pool.execute(`
           SELECT b.*, 
               i.name as infrastructure_name, 
               i.location as infrastructure_location,
               i.id as infrastructure_id
           FROM bookings b
           JOIN infrastructures i ON b.infrastructure_id = i.id
           WHERE b.id = ?`,
            [id]);

        if (bookings.length === 0) {
            res.status(404).json({ message: 'Booking not found' });
            return;
        }

        const booking: any = bookings[0];

        // Assert permission to access this booking
        if (!await hasInfrastructureAccess(req, res, booking.infrastructure_id, undefined, false, false)) {
            if (booking.user_email !== userEmail) {
                res.status(403).json({ message: 'Forbidden access' });
                return;
            }
        }

        // Get filter questions and answers
        const [answers]: any[] = await pool.execute(
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

        const formattedAnswers: Array<any> = answers.map(answer => {
            if (answer.document_path) {
                answer.document_url = `/bookings/download-file/${id}/${answer.question_id}`;
                delete answer.document_path;
            }
            return answer;
        });

        res.json({
            booking,
            answers: formattedAnswers
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching booking details' });
    }
});

export default router;