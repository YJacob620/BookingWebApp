/* Router functions regarding infrastructures for regular users */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// Get active infrastructures (user, guest)
router.get('/active', /*authenticateToken,*/ async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM infrastructures WHERE is_active = 1 ORDER BY name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching active infrastructures:', error);
        res.status(500).json({ message: 'Error fetching active infrastructures' });
    }
});

// Get available timeslots for an infrastructure with optional date filter (user, guest)
router.get('/:infrastructureId/available-timeslots', async (req, res) => {
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

// Get all questions for an infrastructure - only if it's active (user, guest)
router.get('/:infrastructureId/questions',
    async (req, res) => {
        const { infrastructureId } = req.params;

        try {
            const [rows] = await pool.execute(
                'SELECT q.* '
                + 'FROM infrastructure_questions q '
                + 'JOIN infrastructures i ON q.infrastructure_id = i.id '
                + 'WHERE q.infrastructure_id = ? '
                + 'AND i.is_active = 1 '
                + 'ORDER BY q.display_order',
                [infrastructureId]
            );
            res.json(rows);
        } catch (error) {
            console.error('Error fetching questions:', error);
            res.status(500).json({ message: 'Error fetching questions' });
        }
    }
);

module.exports = router;