const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { JWT_SECRET } = require('../config/env');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET);

        // Check if user is blacklisted
        const [users] = await pool.execute(
            'SELECT is_blacklisted FROM users WHERE id = ?',
            [user.userId]
        );

        if (users.length === 0) {
            return res.status(403).json({ message: 'User not found' });
        }

        if (users[0].is_blacklisted === 1 || users[0].is_blacklisted === true) {
            return res.status(403).json({ message: 'This account has been blacklisted. Please contact support.' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(403).json({ message: 'Invalid or expired token' });
    }
};

const authenticateAdmin = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    });
};

const authenticateManager = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    });
};

const authenticateAdminOrManager = (req, res, next) => {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin' && req.user.role !== 'manager') {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Store the role for later use
        req.userRole = req.user.role;
        next();
    });
};

/**
 * Utility function to check access for managing an infrastructure and handle response in one step.
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} infrastructureId - ID of the infrastructure to check
 * @param {Object} connection - Optional DB connection for transactions
 * @param {Object} rollbackOnFail - Whether to call connection.rollback() on failure
 * @param {Object} sendResponseOnFalse - Whether to send a response if and before returning false
 * @returns {Promise<boolean>} Returns true if access is allowed and continues, false if denied and response sent
 */
const hasInfrastructureAccess = async (
    req, res, infrastructureId, connection = pool, rollbackOnFail = false, sendResponseOnFalse = true) => {
    if (connection === null) {
        connection = pool;
    }
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
        if (rollbackOnFail && connection !== pool) {
            await connection.rollback();
        }
        if (sendResponseOnFalse) {
            res.status(403).json({ message: 'Forbidden access' });
        }
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