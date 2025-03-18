const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json();
    }
    next();
};

// Middleware to verify infrastructure manager role
const verifyInfrastructureManager = async (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json();
    }
    next();
};

// Middleware to verify if a user is a manager for a specific infrastructure
const verifyInfrastructureAccess = async (req, res, next) => {
    // Skip check for admins (they have access to everything)
    if (req.user.role === 'admin') {
        return next();
    }

    const infrastructureId = req.params.infrastructureId || req.body.infrastructureId;

    if (!infrastructureId) {
        return res.status(400).json({ message: 'Infrastructure ID is required' });
    }

    try {
        // Check if the user is a manager for this infrastructure
        const [rows] = await pool.execute(
            'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
            [req.user.userId, infrastructureId]
        );

        if (rows.length === 0) {
            return res.status(403).json({ message: 'You do not have access to this infrastructure' });
        }

        next();
    } catch (error) {
        console.error('Error checking infrastructure access:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = {
    authenticateToken,
    verifyAdmin,
    verifyInfrastructureManager,
    verifyInfrastructureAccess
};
