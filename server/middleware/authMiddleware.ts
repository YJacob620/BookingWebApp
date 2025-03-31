import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../config/db';
import { JWT_SECRET } from '../config/env';
import { Pool, PoolConnection } from 'mysql2/promise';

// Extend Request interface to include user property
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
            userRole?: string;
        }
    }
}

interface JwtPayload {
    userId: number;
    email: string;
    role: string;
}

// Middleware to verify JWT token
const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const user = jwt.verify(token, JWT_SECRET) as JwtPayload;

        // Check if user is blacklisted
        const [users] = await pool.execute<any[]>(
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

const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        next();
    });
};

const authenticateManager = (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'manager') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        next();
    });
};

const authenticateAdminOrManager = (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }

        // Store the role for later use
        req.userRole = req.user.role;
        next();
    });
};

/**
 * Utility function to check access for managing an infrastructure and handle response in one step.
 * @param req - Express request object
 * @param res - Express response object
 * @param infrastructureId - ID of the infrastructure to check
 * @param connection - Optional DB connection for transactions
 * @param rollbackOnFail - Whether to call connection.rollback() on failure
 * @param sendResponseOnFalse - Whether to send a response if and before returning false
 * @returns Returns true if access is allowed and continues, false if denied and response sent
 */
const hasInfrastructureAccess = async (
    req: Request,
    res: Response,
    infrastructureId: number | string,
    connection: Pool | PoolConnection = pool,
    rollbackOnFail: boolean = false,
    sendResponseOnFalse: boolean = true
): Promise<boolean> => {
    if (connection === null) {
        connection = pool;
    }
    // Admins always have access to all infrastructures
    if (req.user?.role === 'admin') {
        return true;
    }
    try {
        const [rows] = await connection.execute<any[]>(
            'SELECT * FROM infrastructure_managers WHERE user_id = ? AND infrastructure_id = ?',
            [req.user?.userId, infrastructureId]
        );
        if (rows.length > 0) {
            return true;
        }
        if (rollbackOnFail && connection !== pool) {
            await (connection as PoolConnection).rollback();
        }
        if (sendResponseOnFalse) {
            res.status(403).json({ message: 'Forbidden access' });
        }
        return false;
    } catch (error) {
        console.error('Error checking infrastructure access:', error);
        if (rollbackOnFail && connection !== pool) {
            await (connection as PoolConnection).rollback();
        }
        res.status(500).json({ message: 'Failed to check infrastructure access' });
        return false;
    }
};

export {
    authenticateToken,
    authenticateAdmin,
    authenticateManager,
    authenticateAdminOrManager,
    hasInfrastructureAccess
};