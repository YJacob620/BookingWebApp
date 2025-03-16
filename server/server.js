const express = require('express');
const cors = require('cors');
const path = require('path');
require('./config/env'); // Validate environment variables
const pool = require('./config/db'); // Create database connection pool
const authenticationRoutes = require('./routes/authenticationRoutes');
const infrastructuresRoutes_Admin = require('./routes/infrastructures-Admin');
const infrastructuresRoutes_User = require('./routes/infrastructures-User');
const infrastructuresRoutes_Manager_Admin = require('./routes/infrastructures-Manager-Admin');
const infrastructuresRoutes_Manager = require('./routes/infrastructures-Manager');
const bookingRoutes_Admin = require('./routes/bookings-Admin');
const bookingRoutes_User = require('./routes/bookings-User');
const userManagementRoutes_Admin = require('./routes/userManagement-Admin');
const preferencesRoutes_User_Manager = require('./routes/preferences-User-Manager');
const emailService = require('./utils/emailService');

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
app.use('/api/infrastructures-admin', infrastructuresRoutes_Admin);
app.use('/api/infrastructures-user', infrastructuresRoutes_User);
app.use('/api/bookings-admin', bookingRoutes_Admin);
app.use('/api/bookings-user', bookingRoutes_User);
app.use('/api/manager', infrastructuresRoutes_Manager);
app.use('/api/userManagement-admin', userManagementRoutes_Admin);
app.use('/api/infrastructures-manager-admin', infrastructuresRoutes_Manager_Admin);
app.use('/api/user', preferencesRoutes_User_Manager);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

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