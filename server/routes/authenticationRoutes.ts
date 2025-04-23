import express, { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { PoolConnection, ResultSetHeader } from 'mysql2/promise';

import pool from '../configuration/db';
import {
    JWT_SECRET,
    VERIFICATION_TOKEN_EXPIRY,
    PASSWORD_RESET_EXPIRY
} from '../configuration/env';
import {
    authenticateToken,
    authenticateAdmin,
    authenticateManager,
} from '../middleware/authMiddleware';
import emailService from '../utils/emailService';
import {
    User,
    findUserByIdOrEmail,
    isAllowedUser,
    generateToken
} from '../utils';

const router = express.Router();


interface RegisterRequestBody {
    email: string;
    password: string;
    name: string;
    role?: 'admin' | 'faculty' | 'student';
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


// Login route - Updated to check verification status
router.post('/login', async (req: Request<{}, {}, LoginRequestBody>, res: Response) => {
    const { email, password } = req.body;

    try {
        const user = await findUserByIdOrEmail({ email: email });
        if (!user) {
            res.status(401).json({ message: 'Invalid email' });
            return;
        }
        const isValidPassword = await argon2.verify(user.password_hash, password);

        // Early return if password is invalid
        if (!isValidPassword) {
            res.status(401).json({ message: 'Invalid email or password' });
            return;
        }

        if (!isAllowedUser(user, res)) return;

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
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Registration route
router.post('/register', async (req: Request<{}, {}, RegisterRequestBody>, res: Response) => {
    let connection: PoolConnection | null = null;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        const { email, password, name, role } = req.body;

        // Input validation
        if (!email || !password || !name || !role) {
            res.status(400).json({ message: 'Email, password, name and role are required' });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            res.status(400).json({ message: 'Invalid email format' });
            return;
        }

        // Password complexity validation
        if (password.length < 8) {
            res.status(400).json({ message: 'Password must be at least 8 characters' });
            return;
        }

        // Check if user already exists - if it isn't a guest the registration will fail
        const existingUser = await findUserByIdOrEmail({ email: email });
        if (existingUser) {
            if (existingUser.role !== 'guest') {
                res.status(409).json({ message: 'Email already registered' });
                return;
            }
        }

        // Hash password and generate verification token
        const passwordHash = await argon2.hash(password);
        const verificationToken = generateToken();

        // Calculate expiry (from current time + configured hours)
        const now = new Date();
        const expiryDate = new Date(now.getTime() + VERIFICATION_TOKEN_EXPIRY);

        let query: string;
        let params: any[];
        let userId: number;
        if (existingUser) {
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
            userId = existingUser.id;
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
            await emailService.sendVerificationEmail(email, name, verificationToken);

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
        res.status(500).json({ message: 'Internal server error' });
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
        res.status(400).json({ message: 'Verification token is required' });
        return;
    }

    try {
        // Find user with this verification token
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE verification_token = ?',
            [token]
        );

        if (users.length === 0) {
            res.status(400).json({ message: 'Invalid or expired verification token' });
            return;
        }
        const user = users[0];

        // Check if token is expired
        const now = new Date();
        const tokenExpiry = new Date(user.verification_token_expires as Date);

        if (now > tokenExpiry) {
            res.status(400).json({ message: 'Invalid or expired verification token' });
            return;
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
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Resend verification email
router.post('/resend-verification', async (req: Request<{}, {}, EmailRequestBody>, res: Response) => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }

    try {
        const user = await findUserByIdOrEmail({ email: email });
        if (!user) {
            res.json({ message: 'No user with such an email is registered.' });
            return;
        }

        // Check if already verified
        if (user.is_verified) {
            res.json({ message: 'Your account is already verified. You can log in.' });
            return;
        }

        // Generate new verification token
        const verificationToken = generateToken();

        // Calculate new expiry
        const now = new Date();
        const expiryDate = new Date(now.getTime() + VERIFICATION_TOKEN_EXPIRY);

        // Update user with new verification token
        await pool.execute<ResultSetHeader>(
            'UPDATE users SET verification_token = ?, verification_token_expires = ? WHERE id = ?',
            [verificationToken, expiryDate, user.id]
        );

        // Send verification email
        await emailService.sendVerificationEmail(user.email, user.name, verificationToken);

        res.json({ message: 'A new verification email has been sent. Please check your inbox.' });
    } catch (err) {
        console.error('Resend verification error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Request password reset
router.post('/forgot-password', async (req: Request<{}, {}, EmailRequestBody>, res: Response) => {
    const { email } = req.body;

    if (!email) {
        res.status(400).json({ message: 'Email is required' });
        return;
    }

    try {
        const user = await findUserByIdOrEmail({ email: email });
        if (!user || user.role === "guest") {
            res.json({ message: 'No user with such an email is registered.' });
            return;
        }

        const resetToken = generateToken();
        const now = new Date();
        const expiryDate = new Date(now.getTime() + PASSWORD_RESET_EXPIRY);
        await pool.execute<ResultSetHeader>(
            'UPDATE users SET password_reset_token = ?, password_reset_expires = ? WHERE id = ?',
            [resetToken, expiryDate, user.id]
        );
        await emailService.sendPasswordResetEmail(user, resetToken);

        res.json({ message: 'A password reset link has been sent to your email.' });
    } catch (err) {
        console.error('Password reset request error:', err);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Reset password with token
router.post('/reset-password/:token', async (req: Request<{ token: string }, {}, ResetPasswordRequestBody>, res: Response) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!token || !password) {
        res.status(400).json({ message: 'Token and new password are required' });
        return;
    }

    // Password complexity validation
    if (password.length < 8) {
        res.status(400).json({ message: 'Password must be at least 8 characters' });
        return;
    }

    try {
        // Find user with this reset token
        const [users] = await pool.execute<User[]>(
            'SELECT * FROM users WHERE password_reset_token = ?',
            [token]
        );

        if (users.length === 0) {
            res.status(400).json({ message: 'Invalid or expired password reset token' });
            return;
        }

        const user = users[0];

        // Check if token is expired
        const now = new Date();
        const tokenExpiry = new Date(user.password_reset_expires as Date);

        if (now > tokenExpiry) {
            res.status(400).json({ message: 'Password reset token has expired' });
            return;
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

        res.json({ message: 'Password has been reset successfully. You can now log in with your new password.' });
    } catch (err) {
        console.error('Password reset error:', err);
        res.status(500).json({ message: 'Internal server error' });
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