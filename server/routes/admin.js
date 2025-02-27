const express = require('express');
const router = express.Router();
const { authenticateToken, verifyAdmin } = require('../middleware/authMiddleware');

// Admin verification endpoint
router.get('/verify', authenticateToken, verifyAdmin, (req, res) => {
    res.json({ message: 'Admin verified' });
});

module.exports = router;
