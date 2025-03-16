/* Authentication API functions to be used by the client for communicating with the server */

import {
    User,
    RegistrationFormData,
} from './types'

import {
    API_BASE_URL
} from '@/_utils'

/**
 * Authentication API request function that works independently
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise with { success, data } format
 */
const authApiRequest = async (endpoint: string, options: RequestInit = {}) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {})
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set Content-Type to application/json if not using FormData
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error) {
        console.error(`API error for ${endpoint}:`, error);
        // Try to extract the error message
        let message = 'An unexpected error occurred';
        if (error instanceof Error) {
            message = error.message;
        }
        return { success: false, data: { message } };
    }
};

/**
 * Fetches current user from local storage
 * @returns User object or null if not authenticated
 */
export const getUserFromStorage = (): User | null => {
    const userString = localStorage.getItem('user');
    if (!userString) return null;

    try {
        return JSON.parse(userString) as User;
    } catch (err) {
        console.error('Error parsing user data:', err);
        return null;
    }
};

/**
 * Login user
 * @param email - User email
 * @param password - User password
 * @returns Promise with login response
 */
export const login = async (email: string, password: string) => {
    const result = await authApiRequest('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });

    if (result.success) {
        // Store user and token in localStorage
        localStorage.setItem('user', JSON.stringify(result.data.user));
        localStorage.setItem('token', result.data.token);
    }

    return result;
};

/**
 * Register new user
 * @param userData - User registration data
 * @returns Promise with registration response
 */
export const register = async (userData: RegistrationFormData) => {
    return authApiRequest('/register', {
        method: 'POST',
        body: JSON.stringify(userData),
    });
};

/**
 * Send password reset request
 * @param email - User email
 * @returns Promise with password reset response
 */
export const requestPasswordReset = async (email: string) => {
    return authApiRequest('/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

/**
 * Reset password with token
 * @param token - Password reset token
 * @param password - New password
 * @returns Promise with password reset response
 */
export const resetPassword = async (token: string, password: string) => {
    return authApiRequest(`/reset-password/${token}`, {
        method: 'POST',
        body: JSON.stringify({ password }),
    });
};

/**
 * Resend verification email
 * @param email - User email
 * @returns Promise with resend verification response
 */
export const resendVerification = async (email: string) => {
    return authApiRequest('/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

/**
 * Verify email with token
 * @param token - Email verification token
 * @returns Promise with verification response
 */
export const verifyEmailWithToken = async (token: string) => {
    return authApiRequest(`/verify-email/${token}`, {
        method: 'GET'
    });
};

/**
 * Verify admin authentication
 * @returns Promise with verification result
 */
export const verifyAdmin = async (): Promise<boolean> => {
    const result = await authApiRequest('/verify-admin');
    return result.success;
};

/**
 * Verify infrastructure manager authentication
 * @returns Promise with verification result
 */
export const verifyManager = async (): Promise<boolean> => {
    const result = await authApiRequest('/verify-manager');
    return result.success;
};

/**
 * Verify regular user authentication
 * @returns Promise with verification result
 */
export const verifyUser = async (): Promise<boolean> => {
    const result = await authApiRequest('/verify-user');
    return result.success;
};