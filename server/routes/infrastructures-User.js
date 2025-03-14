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