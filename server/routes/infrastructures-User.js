/* Router functions regarding infrastructures for regular users */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken } = require('../middleware/authMiddleware');

// Get active infrastructures (for all users)
router.get('/active', authenticateToken, async (req, res) => {
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

// Get all questions for an infrastructure - only if it's active (user)
router.get('/:infrastructureId/questions',
    authenticateToken,
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