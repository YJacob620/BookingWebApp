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
        // Similar to the admin booking route but with infrastructure access check
        // Implementation here
    });


module.exports = router;