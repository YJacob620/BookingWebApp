import { User, apiRequest } from './index'

/**
 * Check if user is authenticated
 * @returns Boolean indicating if user is authenticated
 */
export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('token');
};

/**
 * Get current user from local storage
 * @returns User object or null if not authenticated
 */
export const getCurrentUser = (): User | null => {
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
 * Helper function to adapt apiRequest to the return format used by auth functions
 * @param endpoint - API endpoint
 * @param options - Request options
 * @returns Promise with { success, data } format
 */
const authApiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const data = await apiRequest(endpoint, options);
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
export const register = async (userData: {
  name: string;
  email: string;
  password: string;
  role: string;
}) => {
  return authApiRequest('/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
};

/**
 * Logout user
 */
export const logout = () => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');
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
 * Verify admin authentication
 * @returns Promise with verification result
 */
export const verifyAdmin = async (): Promise<boolean> => {
  try {
    await apiRequest('/admin/verify');
    return true;
  } catch (error) {
    return false;
  }
};