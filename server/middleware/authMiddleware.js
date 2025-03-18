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

const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }
        next();
    });
};

const authenticateManager = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Manager access required' });
        }
        next();
    });
};

const authenticateAdminOrManager = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied: Admin or Manager role required' });
        }

        // Store the role for later use
        req.userRole = req.user.role;
        next();
    });
};

// Helper function to check if a manager has access to an infrastructure
const checkInfrastructureAccess = async (userId, infrastructureId, connection = pool) => {
    if (req.userRole === 'admin') {
        return true;
    }

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

module.exports = {
    authenticateToken,
    authenticateAdmin,
    authenticateManager,
    authenticateAdminOrManager,
    checkInfrastructureAccess
};