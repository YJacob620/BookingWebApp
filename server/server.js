const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const argon2 = require('argon2');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const app = express();

// Ensure all required environment variables are present
const requiredEnvVars = ['JWT_SECRET', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];
requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

process.on('SIGTERM', () => {
    console.info('SIGTERM signal received.');
    shutdown();
});

process.on('SIGINT', () => {
    console.info('SIGINT signal received.');
    shutdown();
});

async function shutdown() {
    console.log('Closing HTTP server.');
    await pool.end();
    process.exit(0);
}

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

app.post('/api/login', async (req, res) => {
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

        // Create JWT token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role
            },
            JWT_SECRET,
            { expiresIn: '24h' }
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

// Protected route example
app.get('/api/protected', authenticateToken, (req, res) => {
    res.json({ message: 'Protected data', user: req.user });
});

// Middleware to verify admin role
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Admin verification endpoint
app.get('/api/admin/verify', authenticateToken, verifyAdmin, (req, res) => {
    res.json({ message: 'Admin verified' });
});

app.get('/api/infrastructures', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const [rows] = await pool.execute(
            'SELECT * FROM infrastructures ORDER BY name'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error fetching infrastructures:', error);
        res.status(500).json({ message: 'Error fetching infrastructures' });
    }
});

app.post('/api/infrastructures', authenticateToken, verifyAdmin, async (req, res) => {
    const { name, description, location, is_active } = req.body;

    // Validate required fields
    if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
    }

    try {
        const [result] = await pool.execute(
            `INSERT INTO infrastructures (name, description, location, is_active)
             VALUES (?, ?, ?, ?)`,
            [
                name,
                description,
                location || null,
                is_active ? 1 : 0
            ]
        );

        if (result.affectedRows === 1) {
            res.status(201).json({
                message: 'Infrastructure created successfully',
                id: result.insertId
            });
        } else {
            res.status(500).json({ message: 'Failed to create infrastructure' });
        }
    } catch (error) {
        console.error('Error creating infrastructure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'An infrastructure with this name already exists' });
        } else {
            res.status(500).json({ message: 'Error creating infrastructure' });
        }
    }
});

app.post('/api/infrastructures/:id/toggle-status', authenticateToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // First check if the infrastructure exists
        const [rows] = await pool.execute(
            'SELECT is_active FROM infrastructures WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Infrastructure not found' });
        }

        const [result] = await pool.execute(
            'UPDATE infrastructures SET is_active = NOT is_active WHERE id = ?',
            [id]
        );

        if (result.affectedRows === 1) {
            res.json({ message: 'Status updated successfully' });
        } else {
            res.status(500).json({ message: 'Failed to update status' });
        }
    } catch (error) {
        console.error('Error toggling infrastructure status:', error);
        res.status(500).json({ message: 'Error updating infrastructure status' });
    }
});

// Edit infrastructure endpoint
app.put('/api/infrastructures/:id', authenticateToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, location, is_active } = req.body;

    // Validate required fields
    if (!name || !description) {
        return res.status(400).json({ message: 'Name and description are required' });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE infrastructures 
             SET name = ?, description = ?, location = ?, 
                 is_active = ?
             WHERE id = ?`,
            [
                name,
                description,
                location || null,
                is_active ? 1 : 0,
                id
            ]
        );

        if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Infrastructure not found' });
        } else {
            res.json({ message: 'Infrastructure updated successfully' });
        }
    } catch (error) {
        console.error('Error updating infrastructure:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            res.status(400).json({ message: 'An infrastructure with this name already exists' });
        } else {
            res.status(500).json({ message: 'Error updating infrastructure' });
        }
    }
});

// Get single infrastructure endpoint
app.get('/api/infrastructures/:id', authenticateToken, verifyAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM infrastructures WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            res.status(404).json({ message: 'Infrastructure not found' });
        } else {
            res.json(rows[0]);
        }
    } catch (error) {
        console.error('Error fetching infrastructure:', error);
        res.status(500).json({ message: 'Error fetching infrastructure details' });
    }
});

// Get available timeslots for an infrastructure
app.get('/api/bookings/available/:infrastructureId', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const [timeslots] = await pool.execute(
            `SELECT * FROM bookings 
             WHERE infrastructure_id = ? 
             AND booking_type = 'timeslot'
             AND booking_date >= CURDATE()
             ORDER BY booking_date ASC, start_time ASC`,
            [req.params.infrastructureId]
        );
        res.json(timeslots);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching available timeslots' });
    }
});

// Create a single timeslot
app.post('/api/bookings/timeslots', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { infrastructure_id, booking_date, start_time, end_time } = req.body;

        // Validate input
        if (!infrastructure_id || !booking_date || !start_time || !end_time) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Check if date is in the past
        const bookingDate = new Date(booking_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (bookingDate < today) {
            return res.status(400).json({ message: 'Cannot create timeslots in the past' });
        }

        // Check for overlapping timeslots
        const [overlapping] = await pool.execute(
            `SELECT COUNT(*) as count FROM bookings 
             WHERE infrastructure_id = ? 
             AND booking_date = ?
             AND booking_type = 'timeslot'
             AND ((start_time <= ? AND end_time > ?)
                  OR (start_time < ? AND end_time >= ?)
                  OR (? <= start_time AND ? >= end_time))`,
            [infrastructure_id, booking_date, start_time, start_time, end_time, end_time, start_time, end_time]
        );

        if (overlapping[0].count > 0) {
            return res.status(400).json({ message: 'This timeslot overlaps with an existing slot' });
        }

        // Create the timeslot
        const [result] = await pool.execute(
            `INSERT INTO bookings (infrastructure_id, booking_date, start_time, end_time, status, user_email) 
             VALUES (?, ?, ?, ?, 'available', 'none@system.internal')`,
            [infrastructure_id, booking_date, start_time, end_time]
        );

        res.status(201).json({
            message: 'Timeslot created successfully',
            id: result.insertId
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error creating timeslot' });
    }
});

// Create batch timeslots
app.post('/api/bookings/timeslots/batch', authenticateToken, verifyAdmin, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const {
            infrastructure_id,
            startDate,
            endDate,
            dailyStartTime,
            slotDuration,
            slotsPerDay
        } = req.body;

        // Validate input
        if (!infrastructure_id || !startDate || !endDate || !dailyStartTime || !slotDuration || !slotsPerDay) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        // Validate dates
        const start = new Date(startDate);
        const end = new Date(endDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (start < today) {
            return res.status(400).json({ message: 'Start date cannot be in the past' });
        }
        if (end < start) {
            return res.status(400).json({ message: 'End date must be after start date' });
        }

        let created = 0;
        let skipped = 0;

        // Process each day
        for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
            const currentDate = date.toISOString().split('T')[0];
            let currentTime = new Date(`${currentDate}T${dailyStartTime}`);

            // Create slots for each day
            for (let slot = 0; slot < slotsPerDay; slot++) {
                const startTime = currentTime.toTimeString().slice(0, 5);
                currentTime.setMinutes(currentTime.getMinutes() + slotDuration);
                const endTime = currentTime.toTimeString().slice(0, 5);

                // Check for overlaps
                const [overlapping] = await connection.execute(
                    `SELECT COUNT(*) as count FROM bookings 
                     WHERE infrastructure_id = ? 
                     AND booking_date = ?
                     AND status = 'available'
                     AND ((start_time <= ? AND end_time > ?)
                          OR (start_time < ? AND end_time >= ?)
                          OR (? <= start_time AND ? >= end_time))`,
                    [infrastructure_id, currentDate, startTime, startTime, endTime, endTime, startTime, endTime]
                );

                if (overlapping[0].count === 0) {
                    // Create the timeslot
                    await connection.execute(
                        `INSERT INTO bookings (infrastructure_id, booking_date, start_time, end_time, status) 
                         VALUES (?, ?, ?, ?, 'available')`,
                        [infrastructure_id, currentDate, startTime, endTime]
                    );
                    created++;
                } else {
                    skipped++;
                }
            }
        }

        await connection.commit();
        res.status(201).json({
            message: 'Batch timeslots created successfully',
            created,
            skipped
        });

    } catch (err) {
        await connection.rollback();
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error creating batch timeslots' });
    } finally {
        connection.release();
    }
});

// app.post('/api/bookings/timeslots/cancel', authenticateToken, verifyAdmin, async (req, res) => {
//     try {
//         const { ids } = req.body;

//         if (!ids || !Array.isArray(ids) || ids.length === 0) {
//             return res.status(400).json({ message: 'No timeslots specified for cancellation' });
//         }

//         const placeholders = ids.map(() => '?').join(',');
//         const [result] = await pool.execute(
//             `UPDATE bookings 
//              SET status = 'canceled'
//              WHERE id IN (${placeholders})`,
//             ids
//         );

//         res.json({
//             message: 'Timeslots canceled successfully',
//             canceled: result.affectedRows
//         });

//     } catch (err) {
//         console.error('Database error:', err);
//         res.status(500).json({ message: 'Error canceling timeslots' });
//     }
// });

// Replacing the commented-out delete endpoint with the new cancel endpoint

app.delete('/api/bookings/timeslots', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const { ids } = req.body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ message: 'No timeslots specified for cancellation' });
        }

        // Update status to 'canceled' instead of deleting
        const placeholders = ids.map(() => '?').join(',');
        const [result] = await pool.execute(
            `UPDATE bookings 
             SET status = 'canceled'
             WHERE id IN (${placeholders}) AND booking_type = 'timeslot'`,
            ids
        );

        res.json({
            message: 'Timeslots canceled successfully',
            canceled: result.affectedRows
        });

    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error canceling timeslots' });
    }
});

// Update the available timeslots endpoint to exclude canceled timeslots
app.get('/api/bookings/available/:infrastructureId', authenticateToken, verifyAdmin, async (req, res) => {
    try {
        const [timeslots] = await pool.execute(
            `SELECT * FROM bookings 
             WHERE infrastructure_id = ? 
             AND booking_type = 'timeslot'
             AND status = 'available'
             AND booking_date >= CURDATE()
             ORDER BY booking_date ASC, start_time ASC`,
            [req.params.infrastructureId]
        );
        res.json(timeslots);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ message: 'Error fetching available timeslots' });
    }
});