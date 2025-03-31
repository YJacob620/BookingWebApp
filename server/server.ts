import express from 'express';
import cors from 'cors';
import './configuration/env'; // Validate environment variables
import pool from './configuration/db'; // Create database connection pool
import authenticationRoutes from './routes/authenticationRoutes';
import infrastructuresRoutes_Admin from './routes/infrastructures_Admin';
import infrastructuresRoutes_User_Guest from './routes/infrastructures_User_Guest';
import infrastructuresRoutes_Manager_Admin from './routes/infrastructures_Manager_Admin';
import infrastructuresRoutes_Manager from './routes/infrastructures_Manager';
import bookingRoutes_Manager_Admin from './routes/bookings_Manager_Admin';
import bookingRoutes_User from './routes/bookings_User';
import userManagementRoutes_Admin from './routes/userManagement-Admin';
import preferencesRoutes_User_Manager from './routes/preferences_User_Manager';
import emailService from './utils/emailService';
import emailActionsRoutes from './routes/emailActions_Manager';
import bookingRoutes_All from './routes/bookings_All';
import guestRoutes from './routes/bookings_Guest';

const app = express();
const PORT: number | string = process.env.PORT || 3001;

if (pool) {
    console.log("Database connection pool created successfully.");
} else {
    console.error("Failed to create database connection pool.");
}

// Enable event scheduler
(async (): Promise<void> => {
    try {
        await pool.query("SET GLOBAL event_scheduler = ON;");
        console.log("Event scheduler enabled successfully.");
    } catch (error) {
        console.error("Failed to enable event scheduler:", error);
    }
})();

// Verify email service configuration
(async (): Promise<void> => {
    try {
        const emailConfigValid: boolean = await emailService.verifyEmailConfig();
        if (emailConfigValid) {
            console.log('Email service initialized successfully.');
        } else {
            console.warn('Email service initialization failed - email features may not work.');
        }
    } catch (error) {
        console.error('Error initializing email service:', error);
    }
})();

// Middleware. Also limit maximum size for request bodies 
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

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
app.listen(PORT, (): void => {
    console.log(`Server running on port ${PORT}`);
});

// Process shutdown handling
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown(): Promise<void> {
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

export default app;