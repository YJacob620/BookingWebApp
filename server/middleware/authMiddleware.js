const jwt = require('jsonwebtoken');
const pool = require('../config/db');
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
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Middleware to verify infrastructure manager role
const verifyInfrastructureManager = async (req, res, next) => {
    if (req.user.role !== 'manager') {
        return res.status(403).json({ message: 'Manager access required' });
    }
    next();
};

// Middleware to verify if the user is either an admin or a manager
const verifyAdminOrManager = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'manager') {
        return res.status(403).json({ message: 'Access denied: Admin or Manager role required' });
    }

    // Store the role in the request for later use
    req.userRole = req.user.role;
    next();
};

// Helper function to check if a manager has access to an infrastructure
const checkManagerInfrastructureAccess = async (userId, infrastructureId, connection = pool) => {
    try {
        const [rows] = await connection.execute(
            'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
            [userId, infrastructureId]
        );
        return rows.length > 0;
    } catch (error) {
        console.error('Error checking infrastructure access:', error);
        throw new Error('Failed to verify infrastructure access');
    }
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
        const hasAccess = await checkManagerInfrastructureAccess(req.user.userId, infrastructureId);

        if (!hasAccess) {
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
    verifyInfrastructureAccess,
    verifyAdminOrManager,
    checkManagerInfrastructureAccess
};