const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticateToken, verifyAdmin } = require('../middleware/authMiddleware');

// Get all infrastructures (admin only)
router.get('/', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM infrastructures ORDER BY name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching infrastructures:', error);
        res.status(500).json({ message: 'Error fetching infrastructures' });
    }
});

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

// Create infrastructure (admin only)
router.post('/', authenticateToken, verifyAdmin, async (req, res) => {
    const { name, description, location, is_active } = req.body;

    // Validate required fields
    if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO infrastructures (name, description, location, is_active)
             VALUES (?, ?, ?, ?)`,
            [
                name,
                description,
                location || null,
                is_active ? 1 : 0
            ]
        );

        if (result.affectedRows === 1) {
            res.status(201).json({
                message: 'Infrastructure created successfully',
                id: result.insertId
            });
        } else {
            res.status(500).json({ message: 'Failed to create infrastructure' });
        }
    } catch (error) {
        console.error('Error creating infrastructure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'An infrastructure with this name already exists' });
        } else {
            res.status(500).json({ message: 'Error creating infrastructure' });
        }
    }
});

// Toggle infrastructure status (admin only)
router.post('/:id/toggle-status', authenticateToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // First check if the infrastructure exists
        const [rows] = await pool.execute(
            'SELECT is_active FROM infrastructures WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Infrastructure not found' });
        }

        const [result] = await pool.execute(
            'UPDATE infrastructures SET is_active = NOT is_active WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 1) {
            res.json({ message: 'Status updated successfully' });
        } else {
            res.status(500).json({ message: 'Failed to update status' });
        }
    } catch (error) {
        console.error('Error toggling infrastructure status:', error);
        res.status(500).json({ message: 'Error updating infrastructure status' });
    }
});

// Edit infrastructure (admin only)
router.put('/:id', authenticateToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, location, is_active } = req.body;

    // Validate required fields
    if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE infrastructures 
             SET name = ?, description = ?, location = ?, 
                 is_active = ?
             WHERE id = ?`,
            [
                name,
                description,
                location || null,
                is_active ? 1 : 0,
                id
            ]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Infrastructure not found' });
        } else {
            res.json({ message: 'Infrastructure updated successfully' });
        }
    } catch (error) {
        console.error('Error updating infrastructure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'An infrastructure with this name already exists' });
        } else {
            res.status(500).json({ message: 'Error updating infrastructure' });
        }
    }
});

// Get single infrastructure
router.get('/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM infrastructures WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Infrastructure not found' });
        } else {
            res.json(rows[0]);
        }
    } catch (error) {
        console.error('Error fetching infrastructure:', error);
        res.status(500).json({ message: 'Error fetching infrastructure details' });
    }
});

module.exports = router;
