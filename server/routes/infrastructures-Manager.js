/* Router functions regarding infrastructures for infrastructure managers */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, verifyInfrastructureManager, verifyInfrastructureAccess } = require('../middleware/authMiddleware');


// Get infrastructures managed by the current manager (infers manager from token)
router.get('/', authenticateToken, verifyInfrastructureManager, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT i.*
             FROM infrastructures i
             JOIN infrastructure_managers im ON i.id = im.infrastructure_id
             WHERE im.user_id = ?
             ORDER BY i.name`,
            [req.user.userId] // Use the userId from the JWT token
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching manager infrastructures:', error);
        res.status(500).json({ message: 'Error fetching infrastructures' });
    }
});

// Get all booking entries for a managed infrastructure
router.get('/:infrastructureId/bookings',
    authenticateToken,
    verifyInfrastructureManager,
    verifyInfrastructureAccess,
    async (req, res) => {
        try {
            const { infrastructureId } = req.params;
            const { startDate, endDate, limit } = req.query;

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

            const params = [infrastructureId];

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


module.exports = router;