import { Response } from 'express';
import crypto from 'crypto';
import pool from '../configuration/db';
import { PoolConnection } from 'mysql2/promise';
import fs from 'fs';

import { User } from '../utils';


/**
 * Generate a random token for various uses
 * @returns Random token
 */
export const generateToken = (length: number = 32): string => {
    return crypto.randomBytes(length).toString('hex');
};

/**
 * 
 * @param user Check if a given user is not blacklisted and is verified
 * @param res (optional) A response object to send responses through if/when returning false.
 *          The function will not send any responses if this is not assigned.
 * @returns True if the given user is allowed, false otherwise.
 */
export const isAllowedUser = (user: User, res?: Response): boolean => {
    if (user.is_blacklisted != 0) {
        if (res) {
            res.status(403).json({ message: 'This user has been blacklisted.' });
        }
        return false;
    }
    if (user.is_verified == 0) {
        if (res) {
            res.status(403).json({ message: 'This user has not been verified. Verify via email.' });
        }
        return false;
    }
    return true;
}

interface FindUserOptions {
    id?: number | string;
    email?: string;
    response?: Response;
}

/**
 * Searches for a user by ID or email in the database. This function should be called inside a try-catch block.
 * @param params - id -> (optional) The ID to search for.
 * 
 * - email -> (optional) The email to search for.
 * 
 * - res -> (optional) A response object to send responses through if/when returning null.
 * The function will not send any responses if this is not assigned.
 * @returns The user object if found, otherwise null.
 */
export async function findUserByIdOrEmail(params: FindUserOptions): Promise<User | null> {
    let users;
    if (params.id) {
        [users] = await pool.execute<User[]>('SELECT * FROM users WHERE id = ?', [params.id]);
    } else if (params.email) {
        [users] = await pool.execute<User[]>('SELECT * FROM users WHERE email = ?', [params.email]);
    } else {
        throw new Error("At least one of [id, email] should be defined.")
    }

    if (users.length === 0) {
        if (params.response) {
            params.response.status(404).json({ message: 'User not found' });
        }
        return null;
    }

    return users[0];
}

/**
 * Helper function to handle common error handling in guest booking requests
 * This consolidates the pattern of: rollback transaction, cleanup temp files, and send error response
 * 
 * @param connection - Database connection for rolling back transaction
 * @param tempFiles - Array of temporary file paths to clean up
 * @param res - Express response object for sending the error response
 * @param statusCode - HTTP status code to send
 * @param errorMessage - Error message to include in the response
 */
export const handleBookingError = async (
    connection: PoolConnection,
    tempFiles: string[],
    res: Response,
    statusCode: number,
    errorMessage: string
): Promise<void> => {
    await connection.rollback();
    for (const filePath of tempFiles) {
        try {
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (error) {
            console.error(`Error removing temporary file ${filePath}:`, error);
        }
    }
    res.status(statusCode).json({
        success: false,
        message: errorMessage
    });
};