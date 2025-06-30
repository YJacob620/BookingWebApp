import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Define type for environment variables
interface EnvConfig {
    JWT_SECRET: string;
    VERIFICATION_TOKEN_EXPIRY: number;
    PASSWORD_RESET_EXPIRY: number;
    LOGIN_EXPIRY: number;
}

// Ensure all required environment variables are present
const requiredEnvVars: string[] = [
    'JWT_SECRET',
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'FRONTEND_URL',

    'EMAIL_HOST',
    'EMAIL_PORT',
    'EMAIL_USERNAME',
    'EMAIL_PASSWORD',
    'EMAIL_FROM',
    'EMAIL_FROM_NAME',
    'VERIFICATION_TOKEN_EXPIRY_HOURS',
    'PASSWORD_RESET_EXPIRY_HOURS',
    'LOGIN_EXPIRY_HOURS'
];

requiredEnvVars.forEach(varName => {
    if (!process.env[varName]) {
        console.error(`Missing required environment variable: ${varName}`);
        process.exit(1);
    }
});

// Export JWT secret and other configurations for use in auth middleware
const config: EnvConfig = {
    JWT_SECRET: process.env.JWT_SECRET as string,
    VERIFICATION_TOKEN_EXPIRY: parseInt(process.env.VERIFICATION_TOKEN_EXPIRY_HOURS as string) * 60 * 60 * 1000, // Convert to milliseconds
    PASSWORD_RESET_EXPIRY: parseInt(process.env.PASSWORD_RESET_EXPIRY_HOURS as string) * 60 * 60 * 1000,
    LOGIN_EXPIRY: parseInt(process.env.LOGIN_EXPIRY_HOURS as string) * 60 * 60 * 1000,
};

export const { JWT_SECRET, VERIFICATION_TOKEN_EXPIRY, PASSWORD_RESET_EXPIRY, LOGIN_EXPIRY } = config;
export default config;