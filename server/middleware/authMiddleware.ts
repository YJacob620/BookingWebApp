import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import pool from '../configuration/db';
import { JWT_SECRET } from '../configuration/env';
import { Pool, PoolConnection } from 'mysql2/promise';
import { JwtPayload, User, findUserByIdOrEmail, isAllowedUser } from '../utils';

/**
 * Middleware to verify JWT token. A successful verification means a user is logged in.
 * On success will create req.user.userId, req.user.email, req.user.role.
 */
const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.headers['authorization_token'];

    if (!token) {
        res.status(401).json({ message: 'Authentication required' });
        return;
    }

    try {
        const user = jwt.verify(token, JWT_SECRET) as JwtPayload;

        const retrievedUser = await findUserByIdOrEmail({ id: user.userId, response: res });
        if (!retrievedUser) return;

        if (!isAllowedUser(retrievedUser, res)) return;

        req.user = user;
        next();
    } catch (err) {
        res.status(403).json({ message: 'Invalid or expired token' });
        return;
    }
};


/**
 * Middleware to verify the token belongs to an admin. 
 * Also calls authenticateToken so req.user is created.
 */
const authenticateAdmin = (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'admin') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        next();
    });
};

/**
 * Middleware to verify the token belongs to an infrastructure manager. 
 * Also calls authenticateToken so req.user is created.
 */
const authenticateManager = (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'manager') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
        next();
    });
};

/**
 * Middleware to verify the token belongs to an infrastructure manager or an admin. 
 * Also calls authenticateToken so req.user is created.
 */
const authenticateAdminOrManager = (req: Request, res: Response, next: NextFunction): void => {
    authenticateToken(req, res, () => {
        if (req.user?.role !== 'admin' && req.user?.role !== 'manager') {
            res.status(403).json({ message: 'Access denied' });
            return;
        }
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
    hasInfrastructureAccess,
};