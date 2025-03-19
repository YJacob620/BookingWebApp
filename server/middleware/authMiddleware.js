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

/**
 * Utility function to check access for managing an infrastructure and handle response in one step
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} infrastructureId - ID of the infrastructure to check
 * @param {Object} connection - Optional DB connection for transactions
 * @param {Object} rollbackOnFail - Whether to call connection.rollback() on failure
 * @returns {Promise<boolean>} Returns true if access is allowed and continues, false if denied and response sent
 */
const hasInfrastructureAccess = async (req, res, infrastructureId, connection = pool, rollbackOnFail = false) => {
    // Admins always have access to all infrastructures
    if (req.user.role === 'admin') {
        return true;
    }

    try {
        const [rows] = await connection.execute(
            'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
            [req.user.userId, infrastructureId]
        );

        if (rows.length > 0) {
            return true;
        }

        // Access denied, handle response
        if (rollbackOnFail && connection !== pool) {
            await connection.rollback();
        }

        const message = 'Forbidden access to infrastructure';
        res.status(403).json({ message });
        return false;
    } catch (error) {
        console.error('Error checking infrastructure access:', error);

        if (rollbackOnFail && connection !== pool) {
            await connection.rollback();
        }

        res.status(500).json({ message: 'Failed to check infrastructure access' });
        return false;
    }
};

module.exports = {
    authenticateToken,
    authenticateAdmin,
    authenticateManager,
    authenticateAdminOrManager,
    hasInfrastructureAccess
};