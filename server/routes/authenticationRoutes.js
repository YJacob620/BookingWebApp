const express = require('express');
const router = express.Router();
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');
const { JWT_SECRET, VERIFICATION_TOKEN_EXPIRY, PASSWORD_RESET_EXPIRY } = require('../config/env');
const emailService = require('../utils/emailService');
const { authenticateToken,
    verifyAdmin,
    verifyInfrastructureManager,
    authLimiter,
    verificationLimiter
} = require('../middleware/authMiddleware');


// Login route - Updated to check verification status
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Find user by email
        const [users] = await pool.execute(
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
router.post('/register', async (req, res) => {
    const connection = await pool.getConnection();
    try {
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
        const [existingUsers] = await connection.execute(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        if (existingUsers.length > 0) {
            return res.status(409).json({
                message: 'Email already registered'
            });
        }

        // Validate role
        const validRoles = ['admin', 'faculty', 'student', 'guest'];
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

        // Insert user with verification token
        const [result] = await connection.execute(
            `INSERT INTO users 
            (email, password_hash, name, role, verification_token, verification_token_expires) 
            VALUES (?, ?, ?, ?, ?, ?)`,
            [email, passwordHash, name, role, verificationToken, expiryDate]
        );

        if (result.affectedRows !== 1) {
            throw new Error('Failed to create user');
        }

        // Get the inserted user ID
        const userId = result.insertId;

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
        await connection.rollback();
        console.error('Registration error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    } finally {
        connection.release();
    }
});

// Email verification route
router.get('/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    if (!token) {
        return res.status(400).json({
            message: 'Verification token is required'
        });
    }

    try {
        // Find user with this verification token
        const [users] = await pool.execute(
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
        const tokenExpiry = new Date(user.verification_token_expires);

        if (now > tokenExpiry) {
            return res.status(400).json({
                message: 'Verification token has expired'
            });
        }

        // Update user to verified status
        await pool.execute(
            'UPDATE users SET is_verified = 1, verification_token = NULL, verification_token_expires = NULL WHERE id = ?',
            [user.id]
        );

        // Create JWT token for automatic login - FIXED: renamed to jwtToken
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
            token: jwtToken // Return the JWT token with a different variable name
        });
    } catch (err) {
        console.error('Email verification error:', err);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// Resend verification email
router.post('/resend-verification', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: 'Email is required'
        });
    }

    try {
        // Find user by email
        const [users] = await pool.execute(
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
        await pool.execute(
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

// Example protected route
router.get('/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Protected data', user: req.user });
});

// Request password reset
router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            message: 'Email is required'
        });
    }

    try {
        // Find user by email
        const [users] = await pool.execute(
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
        await pool.execute(
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
router.post('/reset-password/:token', async (req, res) => {
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
        const [users] = await pool.execute(
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
        const tokenExpiry = new Date(user.password_reset_expires);

        if (now > tokenExpiry) {
            return res.status(400).json({
                message: 'Password reset token has expired'
            });
        }

        // Hash the new password
        const passwordHash = await argon2.hash(password);

        // Update password and clear reset token
        await pool.execute(
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
router.get('/verify-admin', authenticateToken, verifyAdmin, (req, res) => {
    res.json({ message: 'Admin verified' });
});

// Infrastructure-manager verification endpoint
router.get('/verify-manager', authenticateToken, verifyInfrastructureManager, (req, res) => {
    res.json({ message: 'Infrastructure manager verified' });
});

// Infrastructure-manager verification endpoint
router.get('/verify-user', authenticateToken, (req, res) => {
    res.json({ message: 'Regular user verified' });
});

module.exports = router;