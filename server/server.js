const express = require('express');
const cors = require('cors');
require('./config/env'); // Validate environment variables
const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/admin');
const infrastructureRoutes = require('./routes/infrastructure');
const adminBookingRoutes = require('./routes/bookings');
const userBookingRoutes = require('./routes/userBookings');
const emailService = require('./utils/emailService'); // Import email service

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/infrastructures', infrastructureRoutes);
app.use('/api/bookings', adminBookingRoutes);
app.use('/api/bookings', userBookingRoutes); // Some routes overlap with admin bookings, auth middleware will handle permissions

// Verify email service configuration
(async () => {
    try {
        const emailConfigValid = await emailService.verifyEmailConfig();
        if (emailConfigValid) {
            console.log('Email service initialized successfully');
        } else {
            console.warn('Email service initialization failed - email features may not work');
        }
    } catch (error) {
        console.error('Error initializing email service:', error);
    }
})();

// Process shutdown handling
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

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});