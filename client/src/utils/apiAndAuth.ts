/* API and authentication functions to be used by the client for communicating with the server */

import { User, InfrastFormData, BatchCreationPayload } from './index'
/**
 * Base URL for API calls
 */
const API_BASE_URL = 'http://localhost:3001/api';

// --------------------------------------- Regular API Functions ---------------------------------------

/**
 * (not exported) Generic API request function with authentication
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise with response data
 */
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');

  // const headers = {
  //   'Content-Type': 'application/json',
  //   ...options.headers,
  // };
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Fetch all infrastructures (admin only)
 */
export const fetchInfrastructures = () => {
  return apiRequest('/infrastructures');
};

/**
 * Fetch active infrastructures (all users)
 */
export const fetchActiveInfrastructures = () => {
  return apiRequest('/infrastructures/active');
};

/**
 * Fetch a single infrastructure by ID
 */
export const fetchInfrastructureById = (id: number) => {
  return apiRequest(`/infrastructures/${id}`);
};

// Booking API

/**
 * Fetch user's recent bookings
 */
export const fetchUserBookings = () => {
  return apiRequest('/bookings/user');
};

/**
 * Fetch all user's bookings
 */
export const fetchAllUserBookings = () => {
  return apiRequest('/bookings/user/all');
};

/**
 * Request a booking (create)
 */
export const createBooking = (data: { timeslot_id: number, purpose: string }) => {
  return apiRequest('/bookings/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Cancel a booking
 */
export const cancelBooking = (id: number) => {
  return apiRequest(`/bookings/${id}/cancel`, {
    method: 'POST',
  });
};

/**
 * Update booking status (admin only)
 */
export const updateBookingStatus = (id: number, status: string) => {
  return apiRequest(`/bookings/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status }),
  });
};

/**
 * Force update past bookings statuses (admin only)
 */
export const forceUpdatePastBookings = () => {
  return apiRequest('/bookings/force-bookings-status-update', {
    method: 'POST',
  });
};

/**
 * Fetch bookings for a specific infrastructure (admin only)
 * @param infrastructureId - ID of the infrastructure
 * @returns Promise with bookings data
 */
export const getInfrastructureBookings = (infrastructureId: number) => {
  return apiRequest(`/bookings/infrastructure/${infrastructureId}`);
};

/**
 * Create or update infrastructure (admin only)
 * @param formData - Infrastructure form data
 * @param infrastructureId - Optional ID for updating existing infrastructure
 * @returns Promise with API response
 */
export const createOrUpdateInfrastructure = (formData: InfrastFormData, infrastructureId?: number) => {
  const url = infrastructureId
    ? `/infrastructures/${infrastructureId}`
    : '/infrastructures';

  const method = infrastructureId ? 'PUT' : 'POST';

  return apiRequest(url, {
    method,
    body: JSON.stringify(formData)
  });
};

/**
 * Toggle infrastructure active status (admin only)
 * @param id - Infrastructure ID
 * @returns Promise with API response
 */
export const toggleInfrastructureStatus = (id: number) => {
  return apiRequest(`/infrastructures/${id}/toggle-status`, {
    method: 'POST'
  });
};

// Timeslots API

/**
 * Fetch available timeslots for an infrastructure
 */
export const fetchAvailableTimeslots = (infrastructureId: number, params?: { startDate?: string, endDate?: string }) => {
  let url = `/bookings/available/${infrastructureId}`;

  if (params) {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  return apiRequest(url);
};

/**
 * Fetch all timeslots for an infrastructure (admin only)
 */
export const fetchAllTimeslots = (infrastructureId: number, params?: { startDate?: string, endDate?: string }) => {
  let url = `/bookings/timeslots/${infrastructureId}`;

  if (params) {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  return apiRequest(url);
};

/**
 * Create timeslots (admin only)
 */
export const createTimeslots = (data: BatchCreationPayload) => {
  return apiRequest('/bookings/create-timeslots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Delete/cancel timeslots (admin only)
 */
export const cancelTimeslots = (ids: number[]) => {
  return apiRequest('/bookings/timeslots', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
};

// --------------------------------------- Authentication API Functions ---------------------------------------

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
 * (not exported) Helper function to adapt apiRequest to the return format used by authentication functions
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
  const result = await authApiRequest('/admin/verify');
  return result.success;
};