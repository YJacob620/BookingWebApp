import express, { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { PoolConnection, ResultSetHeader } from 'mysql2/promise';

import pool from '../config/db';
import { JWT_SECRET, VERIFICATION_TOKEN_EXPIRY, PASSWORD_RESET_EXPIRY } from '../config/env';
import emailService from '../utils/emailService';
import {
    authenticateToken,
    authenticateAdmin,
    authenticateManager
} from '../middleware/authMiddleware';

const router = express.Router();

// Define interfaces
interface User {
    id: number;
    email: string;
    password_hash: string;
    name: string;
    role: 'admin' | 'faculty' | 'student' | 'guest';
    is_verified: boolean;
    verification_token: string | null;
    verification_token_expires: Date | null;
    password_reset_token: string | null;
    password_reset_expires: Date | null;
}

interface RegisterRequestBody {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'faculty' | 'student' | 'guest';
}

interface LoginRequestBody {
    email: string;
    password: string;
}

interface EmailRequestBody {
    email: string;
}

interface ResetPasswordRequestBody {
    password: string;
}

interface JwtPayload {
    userId: number;
    email: string;
    role: string;
}

// Login route - Updated to check verification status
router.post('/login', async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        // Early return if user not found
        if (users.length === 0) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        const user = users[0];
        const isValidPassword = await argon2.verify(user.password_hash, password);

        // Early return if password is invalid
        if (!isValidPassword) {
            return res.status(401).json({
                message: 'Invalid email or password'
            });
        }

        // Check if account is verified
        if (!user.is_verified) {
            return res.status(403).json({
                message: 'Your account has not been verified. Please check your email for verification link.',
                needsVerification: true,
                email: user.email
            });
        }

        // Create JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '4h' }
        );

        // Send response with user data and token
        res.json({
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            token
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// Registration route
router.post('/register', async (req: Request<{}, {}, RegisterRequestBody>, res: Response) => {
    let connection: PoolConnection | null = null;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { email, password, name, role = 'student' } = req.body;

        // Input validation
        if (!email || !password || !name) {
            return res.status(400).json({
                message: 'Email, password, and name are required'
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: 'Invalid email format'
            });
        }

        // Password complexity validation
        if (password.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters'
            });
        }

        // Check if user already exists
        const [existingUsers] = await connection.execute<User[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        let wasGuest = false;
        if (existingUsers.length > 0) {
            if (existingUsers[0].role !== 'guest') {
                return res.status(409).json({
                    message: 'Email already registered'
                });
            }
            wasGuest = true;
        }

        // Validate role
        const validRoles = ['admin', 'faculty', 'student'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                message: 'Invalid role'
            });
        }

        // Hash password
        const passwordHash = await argon2.hash(password);

        // Generate verification token
        const verificationToken = emailService.generateToken();

        // Calculate expiry (from current time + configured hours)
        const now = new Date();
        const expiryDate = new Date(now.getTime() + VERIFICATION_TOKEN_EXPIRY);

        let query: string;
        let params: any[];
        let userId: number;

        if (wasGuest) {
            query = `UPDATE users 
             SET password_hash = ?, 
                 name = ?, 
                 role = ?, 
                 verification_token = ?, 
                 verification_token_expires = ?
             WHERE email = ?`;
            params = [passwordHash, name, role, verificationToken, expiryDate, email];

            const [result] = await connection.execute<ResultSetHeader>(query, params);

            if (result.affectedRows !== 1) {
                throw new Error('Failed to update user');
            }

            // Get the existing user ID
            userId = existingUsers[0].id;
        } else {
            query = `INSERT INTO users 
            (email, password_hash, name, role, verification_token, verification_token_expires) 
            VALUES (?, ?, ?, ?, ?, ?)`;
            params = [email, passwordHash, name, role, verificationToken, expiryDate];

            const [result] = await connection.execute<ResultSetHeader>(query, params);

            if (result.affectedRows !== 1) {
                throw new Error('Failed to create user');
            }

            // Get the inserted user ID
            userId = result.insertId;
        }

        // Commit transaction
        await connection.commit();

        // Send verification email
        try {
            await emailService.sendVerificationEmail({ email, name }, verificationToken);

            res.status(201).json({
                message: 'Registration successful. Please check your email to verify your account.',
                userId
            });
        } catch (emailError) {
            console.error('Error sending verification email:', emailError);

            res.status(201).json({
                message: 'Registration successful, but failed to send verification email. Please contact support.',
                userId
            });
        }
    } catch (err) {
        if (connection) {
            await connection.rollback();
        }
        console.error('Registration error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    } finally {
        if (connection) {
            connection.release();
        }
    }
});

// Email verification route
router.get('/verify-email/:token', async (req: Request<{ token: string }>, res: Response) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({
            message: 'Verification token is required'
        });
    }

    try {
        // Find user with this verification token
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE verification_token = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                message: 'Invalid verification token'
            });
        }

        const user = users[0];

        // Check if token is expired
        const now = new Date();
        const tokenExpiry = new Date(user.verification_token_expires as Date);

        if (now > tokenExpiry) {
            return res.status(400).json({
                message: 'Verification token has expired'
            });
        }

        // Update user to verified status
        await pool.execute<ResultSetHeader>(
            'UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
            [user.id]
        );

        // Create JWT token for automatic login
        const jwtToken = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Email verification successful! Your account is now active.',
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name: user.name
            },
            token: jwtToken
        });
    } catch (err) {
        console.error('Email verification error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// Resend verification email
router.post('/resend-verification', async (req: Request<{}, {}, EmailRequestBody>, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: 'Email is required'
        });
    }

    try {
        // Find user by email
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // For security reasons, don't reveal whether the email exists
            return res.json({
                message: 'If your email is registered, a verification link will be sent.'
            });
        }

        const user = users[0];

        // Check if already verified
        if (user.is_verified) {
            return res.json({
                message: 'Your account is already verified. You can log in.'
            });
        }

        // Generate new verification token
        const verificationToken = emailService.generateToken();

        // Calculate new expiry
        const now = new Date();
        const expiryDate = new Date(now.getTime() + VERIFICATION_TOKEN_EXPIRY);

        // Update user with new verification token
        await pool.execute<ResultSetHeader>(
            'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
            [verificationToken, expiryDate, user.id]
        );

        // Send verification email
        await emailService.sendVerificationEmail({ email: user.email, name: user.name }, verificationToken);

        res.json({
            message: 'A new verification email has been sent. Please check your inbox.'
        });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// Request password reset
router.post('/forgot-password', async (req: Request<{}, {}, EmailRequestBody>, res: Response) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: 'Email is required'
        });
    }

    try {
        // Find user by email
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            // For security reasons, don't reveal whether the email exists
            return res.json({
                message: 'If your email is registered, a password reset link will be sent.'
            });
        }

        const user = users[0];

        // Generate password reset token
        const resetToken = emailService.generateToken();

        // Calculate expiry (shorter than verification - typically 1 hour)
        const now = new Date();
        const expiryDate = new Date(now.getTime() + PASSWORD_RESET_EXPIRY);

        // Update user with reset token
        await pool.execute<ResultSetHeader>(
            'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
            [resetToken, expiryDate, user.id]
        );

        // Send password reset email
        await emailService.sendPasswordResetEmail({ email: user.email, name: user.name }, resetToken);

        res.json({
            message: 'If your email is registered, a password reset link will be sent.'
        });
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// Reset password with token
router.post('/reset-password/:token', async (req: Request<{ token: string }, {}, ResetPasswordRequestBody>, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
        return res.status(400).json({
            message: 'Token and new password are required'
        });
    }

    // Password complexity validation
    if (password.length < 8) {
        return res.status(400).json({
            message: 'Password must be at least 8 characters'
        });
    }

    try {
        // Find user with this reset token
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE password_reset_token = ?',
            [token]
        );

        if (users.length === 0) {
            return res.status(400).json({
                message: 'Invalid or expired password reset token'
            });
        }

        const user = users[0];

        // Check if token is expired
        const now = new Date();
        const tokenExpiry = new Date(user.password_reset_expires as Date);

        if (now > tokenExpiry) {
            return res.status(400).json({
                message: 'Password reset token has expired'
            });
        }

        // Hash the new password
        const passwordHash = await argon2.hash(password);

        // Update password and clear reset token
        await pool.execute<ResultSetHeader>(
            `UPDATE users 
             SET password_hash = ?, 
                 password_reset_token = NULL, 
                 password_reset_expires = NULL,
                 is_verified = 1
             WHERE id = ?`,
            [passwordHash, user.id]
        );

        res.json({
            message: 'Password has been reset successfully. You can now log in with your new password.'
        });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// Admin verification endpoint
router.get('/verify-admin', authenticateAdmin, (req: Request, res: Response) => {
    res.json({ message: 'Admin verified' });
});

// Infrastructure-manager verification endpoint
router.get('/verify-manager', authenticateManager, (req: Request, res: Response) => {
    res.json({ message: 'Infrastructure manager verified' });
});

// User verification endpoint
router.get('/verify-user', authenticateToken, (req: Request, res: Response) => {
    res.json({ message: 'Regular user verified' });
});

export default router;