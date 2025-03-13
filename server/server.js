const express = require('express');
const cors = require('cors');
require('./config/env'); // Validate environment variables
const pool = require('./config/db'); // Create database connection pool
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/admin');
const infrastructureRoutes = require('./routes/infrastructure');
const adminBookingRoutes = require('./routes/bookings');
const userBookingRoutes = require('./routes/userBookings');
const emailService = require('./utils/emailService');
const infrastructureManagerRoutes = require('./routes/infrastructureManager');
const adminUserManagementRoutes = require('./routes/adminUserManagement');
const infrastructureQuestionsRoutes = require('./routes/infrastructureQuestions');
const userPreferencesRoutes = require('./routes/userPreferences');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable event scheduler
(async () => {
    try {
        await pool.query("SET GLOBAL event_scheduler = ON;");
        console.log("Event scheduler enabled successfully.");
    } catch (error) {
        console.error("Failed to enable event scheduler:", error);
    }
})();

// Verify email service configuration
(async () => {
    try {
        const emailConfigValid = await emailService.verifyEmailConfig();
        if (emailConfigValid) {
            console.log('Email service initialized successfully.');
        } else {
            console.warn('Email service initialization failed - email features may not work.');
        }
    } catch (error) {
        console.error('Error initializing email service:', error);
    }
})();

// Middleware
app.use(cors());
app.use(express.json());

// Register routes
app.use('/api', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/infrastructures', infrastructureRoutes);
app.use('/api/bookings', adminBookingRoutes);
app.use('/api/bookings', userBookingRoutes); // Some routes overlap with admin bookings, auth middleware will handle permissions
app.use('/api/manager', infrastructureManagerRoutes);
app.use('/api/admin', adminUserManagementRoutes);
app.use('/api/infrastructures', infrastructureQuestionsRoutes);
app.use('/api/user', userPreferencesRoutes);

// Start the server only after async operations complete
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

// Process shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
    console.log('Shutting down server...');

    try {
        await pool.query("SET GLOBAL event_scheduler = OFF;");
        console.log("Event scheduler disabled successfully.");
    } catch (error) {
        console.error("Failed to disable event scheduler:", error);
    }

    console.log('Closing HTTP server.');
    await pool.end();
    process.exit(0);
}