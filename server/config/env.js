require('dotenv').config();

// Ensure all required environment variables are present
const requiredEnvVars = [
    // Existing variables
    'JWT_SECRET',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'FRONTEND_URL',

    // New email-related variables
    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD',
    'EMAIL_FROM',
    'EMAIL_FROM_NAME',
    'VERIFICATION_TOKEN_EXPIRY_HOURS',
    'PASSWORD_RESET_EXPIRY_HOURS'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});

// Export JWT secret for use in auth middleware
module.exports = {
    JWT_SECRET: process.env.JWT_SECRET,
    VERIFICATION_TOKEN_EXPIRY: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS) * 60 * 60 * 1000, // Convert to milliseconds
    PASSWORD_RESET_EXPIRY: parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS) * 60 * 60 * 1000 // Convert to milliseconds
};