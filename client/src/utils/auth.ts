import { User, apiRequest, API_BASE_URL } from './index'


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
 * Login user
 * @param email - User email
 * @param password - User password
 * @returns Promise with login response
 */
export const login = async (email: string, password: string) => {
  const response = await fetch('http://localhost:3001/api/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (response.ok) {
    // Store user and token in localStorage
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('token', data.token);
  }

  return { success: response.ok, data };
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
  const response = await fetch('http://localhost:3001/api/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(userData),
  });

  return { success: response.ok, data: await response.json() };
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
  const response = await fetch('http://localhost:3001/api/forgot-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return { success: response.ok, data: await response.json() };
};

/**
 * Reset password with token
 * @param token - Password reset token
 * @param password - New password
 * @returns Promise with password reset response
 */
export const resetPassword = async (token: string, password: string) => {
  const response = await fetch(`http://localhost:3001/api/reset-password/${token}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ password }),
  });

  return { success: response.ok, data: await response.json() };
};

/**
 * Resend verification email
 * @param email - User email
 * @returns Promise with resend verification response
 */
export const resendVerification = async (email: string) => {
  const response = await fetch('http://localhost:3001/api/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });

  return { success: response.ok, data: await response.json() };
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
