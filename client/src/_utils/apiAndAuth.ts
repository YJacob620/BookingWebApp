/* API and authentication functions to be used by the client for communicating with the server */

import {
  User,
  InfrastFormData,
  BatchCreationPayload,
  RegistrationFormData,
  FilterQuestionData
} from './index'
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
  return apiRequest('/infrastructures-admin');
};

/**
 * Fetch active infrastructures (all users)
 */
export const fetchActiveInfrastructures = () => {
  return apiRequest('/infrastructures-user/active');
};

/**
 * Fetch a single infrastructure by ID
 */
export const fetchInfrastructureById = (id: number) => {
  return apiRequest(`/infrastructures-admin/${id}`);
};

/**
 * Fetch user's recent bookings
 */
export const fetchUserBookings = () => {
  return apiRequest('/bookings-user/user');
};

/**
 * Fetch all user's bookings
 */
export const fetchAllUserBookings = () => {
  return apiRequest('/bookings-user/user/all');
};

/**
 * Request a booking (user)
 */
export const bookTimeslot = (data: { timeslot_id: number, purpose: string }) => {
  return apiRequest('/bookings-user/request', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Request a booking with additional form data (for questions and file uploads)
 * @param formData - FormData object containing timeslot_id, purpose, and answers
 * @returns Promise with booking response
 */
export const bookTimeslotWithAnswers = async (formData: FormData) => {
  const token = localStorage.getItem('token');

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Note: Don't set Content-Type for FormData, browser will set it with boundary

  const response = await fetch(`${API_BASE_URL}/bookings-user/request-with-answers`, {
    method: 'POST',
    headers,
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `API request failed with status ${response.status}`);
  }

  return response.json();
};

/**
 * Cancel a booking (user)
*/
export const userCancelBooking = (id: number) => {
  return apiRequest(`/bookings-user/${id}/cancel`, {
    method: 'POST',
  });
};

/**
 * Aprove a booking (admin)
*/
export const approveBooking = (bookingId: number) => {
  return apiRequest(`/bookings-admin/${bookingId}/approve`, {
    method: 'PUT'
  });
};

/**
 * Reject or cancel a booking (admin)
*/
export const rejectOrCancelBooking = (bookingId: number, newStatus: 'rejected' | 'canceled') => {
  return apiRequest(`/bookings-admin/${bookingId}/reject-or-cancel`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus }),
  });
};

/**
 * Force update past bookings statuses (admin only)
 */
export const forceUpdatePastBookings = () => {
  return apiRequest('/bookings-admin/force-bookings-status-update', {
    method: 'POST',
  });
};

/**
 * Fetches all booking entries (both bookings and timeslots) for a specific infrastructure (admin only)
 * @param infrastructureId - ID of the infrastructure
 * @param params - Optional parameters for filtering (startDate, endDate, limit)
 * @returns Promise with all booking entries
 */
export const fetchAllBookingEntries = (
  infrastructureId: number,
  params?: {
    startDate?: string,
    endDate?: string,
    limit?: number
  }
) => {
  let url = `/bookings-admin/${infrastructureId}/all-entries`;

  if (params) {
    const queryParams = new URLSearchParams();
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.limit) queryParams.append('limit', params.limit.toString());

    if (queryParams.toString()) {
      url += `?${queryParams.toString()}`;
    }
  }

  return apiRequest(url);
};

/**
 * Create or update infrastructure (admin only)
 * @param formData - Infrastructure form data
 * @param infrastructureId - Optional ID for updating existing infrastructure
 * @returns Promise with API response
 */
export const createOrUpdateInfrastructure = (formData: InfrastFormData, infrastructureId?: number) => {
  const url = infrastructureId ? `/infrastructures-admin/${infrastructureId}` : '/infrastructures-admin';

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
  return apiRequest(`/infrastructures-admin/${id}/toggle-status`, {
    method: 'POST'
  });
};

/**
 * Fetches available (only) timeslots for an infrastructure (for user)
 */
export const fetchInfrastAvailTimeslots = (infrastructureId: number, params?: { startDate?: string, endDate?: string }) => {
  let url = `/bookings-user/${infrastructureId}/available-timeslots`;

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
  return apiRequest('/bookings-admin/create-timeslots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Delete/cancel timeslots (admin only)
 */
export const cancelTimeslots = (ids: number[]) => {
  return apiRequest('/bookings-admin/timeslots', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
};

/** 
 * Fetch all users (admin only)
*/
export const fetchUsers = () => {
  return apiRequest('/userManagement-admin/users');
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = (userId: number, role: string) => {
  return apiRequest(`/userManagement-admin/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

/**
 * Toggle user blacklist status (admin only)
 */
export const toggleUserBlacklist = (userId: number, blacklist: boolean) => {
  return apiRequest(`/userManagement-admin/users/${userId}/blacklist`, {
    method: 'PUT',
    body: JSON.stringify({ blacklist }),
  });
};

/**
 * For managers to fetch their own assigned infrastructures
 */
export const fetchMyInfrastructures = () => {
  return apiRequest('/manager/my-infrastructures');
};

/**
 * For admins to fetch infrastructures assigned to a specific manager
 */
export const fetchUserInfrastructures = (userId: number) => {
  return apiRequest(`/userManagement-admin/users/${userId}/infrastructures`);
};

/**
 * Assign infrastructure to manager (admin only)
 */
export const assignInfrastructureToManager = (userId: number, infrastructureId: number) => {
  return apiRequest(`/userManagement-admin/users/${userId}/infrastructures`, {
    method: 'POST',
    body: JSON.stringify({ infrastructureId }),
  });
};

/**
 * Remove infrastructure from manager (admin only)
 */
export const removeInfrastructureFromManager = (userId: number, infrastructureId: number) => {
  return apiRequest(`/userManagement-admin/users/${userId}/infrastructures/${infrastructureId}`, {
    method: 'DELETE',
  });
};

/**
 * Fetch all questions for an infrastructure
 */
export const fetchInfrastructureQuestions = (infrastructureId: number) => {
  return apiRequest(`/infrastructures-manager-admin/${infrastructureId}/questions`);
};

// Create or update a question
export const saveInfrastructureQuestion = (filterQuestionData: FilterQuestionData) => {
  const method = filterQuestionData.id ? 'PUT' : 'POST';
  const endpoint = filterQuestionData.id
    ? `/infrastructures-manager-admin/${filterQuestionData.infrastructure_id}/questions/${filterQuestionData.id}`
    : `/infrastructures-manager-admin/${filterQuestionData.infrastructure_id}/questions`;

  return apiRequest(endpoint, {
    method,
    body: JSON.stringify(filterQuestionData),
  });
};

/**
 * Delete a question
 */
export const deleteInfrastructureQuestion = (infrastructureId: number, questionId: number) => {
  return apiRequest(`/infrastructures-manager-admin/${infrastructureId}/questions/${questionId}`, {
    method: 'DELETE',
  });
};

/**
 * Update the order of questions
 */
export const updateQuestionsOrder = (infrastructureId: number, questionsOrder: { id: number, display_order: number }[]) => {
  return apiRequest(`/infrastructures-manager-admin/${infrastructureId}/questions/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ questions: questionsOrder }),
  });
};

/**
 * Fetch current user's email notification preferences
 * @returns Promise with email notification preferences
 */
export const fetchEmailPreferences = async () => {
  try {
    const response = await apiRequest('/user/preferences/email');
    return response;
  } catch (error) {
    console.error('Error fetching email preferences:', error);
    throw error;
  }
};

/**
 * Update email notification preferences for current user
 * @param enabled - Boolean indicating if email notifications should be enabled
 * @returns Promise with updated preferences
 */
export const updateEmailPreferences = async (enabled: boolean) => {
  try {
    const response = await apiRequest('/user/preferences/email', {
      method: 'PUT',
      body: JSON.stringify({ email_notifications: enabled }),
    });
    return response;
  } catch (error) {
    console.error('Error updating email preferences:', error);
    throw error;
  }
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
 * Fetches current user from local storage
 * @returns User object or null if not authenticated
 */
export const fetchCurrentUser = (): User | null => {
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
export const register = async (userData: RegistrationFormData) => {
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
  const result = await authApiRequest('/verify-admin');
  return result.success;
};

export const verifyEmailWithToken = async (token: string) => {
  return authApiRequest(`/verify-email/${token}`, {
    method: 'GET'
  });
};

/**
* Verify infrastructure manager authentication
 */
export const verifyManager = async (): Promise<boolean> => {
  const result = await authApiRequest('/verify-manager');
  return result.success;
};

