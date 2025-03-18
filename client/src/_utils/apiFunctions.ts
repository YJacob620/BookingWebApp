/* General-purpose API functions to be used by the client for communicating with the server */

import { getLocalUser } from '@/_utils';
import {
  InfrastFormData,
  BatchCreationPayload,
  FilterQuestionData,
  BookingEntry,
  Infrastructure,
  User
} from './types';

/**
 * Base URL for API calls
 */
export const API_BASE_URL = 'http://localhost:3001/api';

/**
 * Generic API request function with authentication
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @returns Promise with response data
 */
const apiRequest = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Important: Only set Content-Type to application/json if not using FormData
  // When using FormData, we need to let the browser set the Content-Type with the proper boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Clone the response to allow multiple reads if needed
  const responseClone = response.clone();

  // Handle non-successful responses
  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;

    try {
      // Try to parse error as JSON
      const errorData = await responseClone.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If not JSON, get as text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (textError) {
        // If both fail, use the status text
        errorMessage = response.statusText || errorMessage;
      }
    }

    const error = new Error(errorMessage);
    throw error;
  }

  // Attempt to parse JSON response
  try {
    const responseData = await response.json();
    return responseData as T;
  } catch (e) {
    // If not JSON, return the raw text
    try {
      const text = await responseClone.text();
      return text as unknown as T;
    } catch (textError) {
      // If both fail, return an empty object
      return {} as T;
    }
  }
};

/**
 * Fetch all relevant infrastructures (admin or infrastructure-manager only)
 */
export const fetchInfrastructures = (): Promise<Infrastructure[]> => {
  const user: User = getLocalUser();
  if (user?.role === "admin") {
    return apiRequest('/infrastructures/admin');
  }
  if (user?.role === "manager") {
    return apiRequest('/infrastructures/manager');
  }
  console.error("Couldn't fetch infrastructures");
  return Promise.resolve([]);
};

/**
 * For managers to fetch their own assigned infrastructures
 */
export const fetchMyInfrastructures = (): Promise<Infrastructure[]> => {
  return apiRequest('/manager/my-infrastructures');
};

/**
 * Fetch active infrastructures (all users)
 */
export const fetchActiveInfrastructures = (): Promise<Infrastructure[]> => {
  return apiRequest('/infrastructures/user/active');
};

/**
 * Fetch user's recent bookings
 */
export const fetchRecentUserBookings = (): Promise<BookingEntry[]> => {
  return apiRequest('/bookings/user/recent');
};

/**
 * Fetch all user's bookings
 */
export const fetchAllUserBookings = (): Promise<BookingEntry[]> => {
  return apiRequest('/bookings/user/all');
};

/**
 * Request a booking (user)
 * @param data - Object containing timeslot_id and purpose
 * @returns Promise with booking response
 */
export const bookTimeslot = (data: { timeslot_id: number, purpose: string }) => {
  return apiRequest('/bookings/user/request', {
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
  // When using FormData, we need a special apiRequest call that doesn't set the Content-Type header
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {};

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Do NOT set Content-Type for FormData
  // The browser will set it automatically with the correct boundary

  const response = await fetch(`${API_BASE_URL}/bookings/user/request`, {
    method: 'POST',
    headers,
    body: formData
  });

  // Clone the response before reading its body to avoid consuming the stream
  const responseClone = response.clone();

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      // Try to read as JSON first
      const errorData = await responseClone.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // If not JSON, try to read as text
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (textError) {
        // If both fail, use the status text
        errorMessage = response.statusText || errorMessage;
      }
    }
    throw new Error(errorMessage);
  }

  try {
    // Try to parse as JSON
    return await response.json();
  } catch (e) {
    // If parsing as JSON fails, return the raw text
    return { message: await responseClone.text() };
  }
};

/**
 * Cancel a booking (user)
*/
export const userCancelBooking = (id: number) => {
  return apiRequest(`/bookings/user/${id}/cancel`, {
    method: 'POST',
  });
};

/**
 * Approve a booking (admin)
*/
export const approveBooking = (bookingId: number) => {
  return apiRequest(`/bookings/manager-admin/${bookingId}/approve`, {
    method: 'PUT'
  });
};

/**
 * Reject or cancel a booking (admin)
*/
export const rejectOrCancelBooking = (bookingId: number, newStatus: 'rejected' | 'canceled') => {
  return apiRequest(`/bookings/manager-admin/${bookingId}/reject-or-cancel`, {
    method: 'PUT',
    body: JSON.stringify({ status: newStatus }),
  });
};

/**
 * Force update past bookings statuses (admin only)
 */
export const forceUpdatePastBookings = () => {
  return apiRequest('/bookings/manager-admin/force-bookings-status-update', {
    method: 'POST',
  });
};

/**
 * Fetches all booking entries (both bookings and timeslots) for a specific infrastructure
 * Works for both admins and managers with appropriate permissions
 * 
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
): Promise<BookingEntry[]> => {
  let url = `/bookings/manager-admin/${infrastructureId}/all-entries`;

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
  const url = infrastructureId ? `/infrastructures/admin/${infrastructureId}` : '/infrastructures/admin';
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
  return apiRequest(`/infrastructures/admin/${id}/toggle-status`, {
    method: 'POST'
  });
};

/**
 * Fetches available (only) timeslots for an infrastructure (for user)
 */
export const fetchInfrastAvailTimeslots =
  (infrastructureId: number, params?: { date?: string }): Promise<BookingEntry[]> => {
    let url = `/bookings/user/${infrastructureId}/available-timeslots`;

    if (params?.date) {
      url += `?date=${params.date}`;
    }

    return apiRequest(url);
  };

/**
 * Create timeslots (admin only)
 */
export const createTimeslots = (data: BatchCreationPayload) => {
  return apiRequest('/bookings/manager-admin/create-timeslots', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Delete/cancel timeslots (admin only)
 */
export const cancelTimeslots = (ids: number[]) => {
  return apiRequest('/bookings/manager-admin/timeslots', {
    method: 'DELETE',
    body: JSON.stringify({ ids }),
  });
};

/** 
 * Fetch all users (admin only)
*/
export const fetchUsers = () => {
  return apiRequest('/user_management/users');
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = (userId: number, role: string) => {
  return apiRequest(`/user_management/users/${userId}/role`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
};

/**
 * Toggle user blacklist status (admin only)
 */
export const toggleUserBlacklist = (userId: number, blacklist: boolean) => {
  return apiRequest(`/user_management/users/${userId}/blacklist`, {
    method: 'PUT',
    body: JSON.stringify({ blacklist }),
  });
};

/**
 * For admins to fetch infrastructures assigned to a specific manager
 */
export const fetchUserInfrastructures = (userId: number) => {
  return apiRequest(`/user_management/users/${userId}/infrastructures`);
};

/**
 * Assign infrastructure to manager (admin only)
 */
export const assignInfrastructureToManager = (userId: number, infrastructureId: number) => {
  return apiRequest(`/user_management/users/${userId}/infrastructures`, {
    method: 'POST',
    body: JSON.stringify({ infrastructureId }),
  });
};

/**
 * Remove infrastructure from manager (admin only)
 */
export const removeInfrastructureFromManager = (userId: number, infrastructureId: number) => {
  return apiRequest(`/user_management/users/${userId}/infrastructures/${infrastructureId}`, {
    method: 'DELETE',
  });
};

/**
 * Fetch all questions for an infrastructure
 */
export const fetchInfrastructureQuestions = (infrastructureId: number): Promise<FilterQuestionData[]> => {
  return apiRequest(`/infrastructures/manager-admin/${infrastructureId}/questions`);
};

/**
 * Create or update a question
 */
export const saveInfrastructureQuestion = (questionData: FilterQuestionData) => {
  const method = questionData.id ? 'PUT' : 'POST';
  const endpoint = questionData.id
    ? `/infrastructures/manager-admin/${questionData.infrastructure_id}/questions/${questionData.id}`
    : `/infrastructures/manager-admin/${questionData.infrastructure_id}/questions`;

  return apiRequest(endpoint, {
    method,
    body: JSON.stringify(questionData),
  });
};

/**
 * Delete a question
 */
export const deleteInfrastructureQuestion = (infrastructureId: number, questionId: number) => {
  return apiRequest(`/infrastructures/manager-admin/${infrastructureId}/questions/${questionId}`, {
    method: 'DELETE',
  });
};

/**
 * Update the order of questions
 */
export const updateQuestionsOrder = (infrastructureId: number, questionsOrder: { id: number, display_order: number }[]) => {
  return apiRequest(`/infrastructures/manager-admin/${infrastructureId}/questions/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ questions: questionsOrder }),
  });
};

/**
 * Fetch current user's email notification preferences
 * @returns Promise with email notification preferences
 */
export const fetchEmailPreferences = async () => {
  return apiRequest('/user/preferences/email');
};

/**
 * Update email notification preferences for current user
 * @param enabled - Boolean indicating if email notifications should be enabled
 * @returns Promise with updated preferences
 */
export const updateEmailPreferences = async (enabled: boolean) => {
  return apiRequest('/user/preferences/email', {
    method: 'PUT',
    body: JSON.stringify({ email_notifications: enabled }),
  });
};