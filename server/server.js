const express = require('express');
const cors = require('cors');
require('./config/env'); // Validate environment variables
const pool = require('./config/db'); // Create database connection pool
const authenticationRoutes = require('./routes/authenticationRoutes');
const infrastructuresRoutes_Admin = require('./routes/infrastructures_Admin');
const infrastructuresRoutes_User_Guest = require('./routes/infrastructures_User_Guest');
const infrastructuresRoutes_Manager_Admin = require('./routes/infrastructures_Manager_Admin');
const infrastructuresRoutes_Manager = require('./routes/infrastructures_Manager');
const bookingRoutes_Manager_Admin = require('./routes/bookings_Manager_Admin');
const bookingRoutes_User = require('./routes/bookings_User');
const userManagementRoutes_Admin = require('./routes/userManagement-Admin');
const preferencesRoutes_User_Manager = require('./routes/preferences_User_Manager');
const emailService = require('./utils/emailService');
const emailActionsRoutes = require('./routes/emailActions_Manager');
const bookingRoutes_All = require('./routes/bookings_All');
const guestRoutes = require('./routes/bookings_Guest');

const app = express();
const PORT = process.env.PORT || 3001;

if (pool) {
    console.log("Database connection pool created successfully.");
} else {
    console.error("Failed to create database connection pool.");
}

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
app.use('/api', authenticationRoutes);
app.use('/api/infrastructures/admin', infrastructuresRoutes_Admin);
app.use('/api/infrastructures/manager-admin', infrastructuresRoutes_Manager_Admin);
app.use('/api/infrastructures/manager', infrastructuresRoutes_Manager);
app.use('/api/infrastructures/user-guest', infrastructuresRoutes_User_Guest);
app.use('/api/bookings', bookingRoutes_All);
app.use('/api/bookings/manager-admin', bookingRoutes_Manager_Admin);
app.use('/api/bookings/user', bookingRoutes_User);
app.use('/api/user_management', userManagementRoutes_Admin);
app.use('/api/preferences/user-manager', preferencesRoutes_User_Manager);
app.use('/api/email-action', emailActionsRoutes);
app.use('/api/guest', guestRoutes);

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