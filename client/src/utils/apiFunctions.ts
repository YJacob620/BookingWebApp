/* General-purpose API functions to be used by the client for communicating with the server */

import { getLocalToken, getLocalUser } from '@/utils';
import {
  InfrastFormData,
  BatchCreationPayload,
  FilterQuestionData,
  BookingEntry,
  Infrastructure,
  User,
  BookingDetails,
  FilterQuestionsAnswersType
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
  const token = getLocalToken();
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };

  if (token) {
    headers['authorization_token'] = token;
  }

  // Important: Only set Content-Type to application/json if not using FormData
  // When using FormData, we need to let the browser set the Content-Type with the proper boundary
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers, });

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
 * Fetch all relevant infrastructures (handles any user role).
 * Default return value is the infrastructures relevant to guests.
 */
export const fetchInfrastructures = (): Promise<Infrastructure[]> => {
  const user = getLocalUser();
  if (user) {
    if (user.role === "admin") {
      return apiRequest('/infrastructures/admin');
    }
    if (user.role === "manager") {
      return apiRequest('/infrastructures/manager');
    }
  }
  return apiRequest('/infrastructures/user-guest/active');
};

/**
 * Fetch user's recent or all bookings.
 *
 * @param {boolean} [recent=false] - If `true`, fetches only the user's recent bookings; otherwise, fetches all bookings.
 * @returns A promise that resolves to an array of booking entries.
 */
export const fetchUserBookings = (recent: boolean = false): Promise<BookingEntry[]> => {
  return apiRequest(`/bookings/user/${recent === true ? 'recent' : 'all'}`);
};

/**
 * Request a booking using FormData for all cases (replaces both bookTimeslot and bookTimeslotWithAnswers)
 * @param timeslotId - ID of the selected timeslot
 * @param purpose - Purpose of the booking (optional)
 * @param answers - Map of question IDs to answers (optional)
 * @returns Promise with booking response
 */
export const bookTimeslot = async (
  timeslotId: number,
  purpose: string = '',
  answers: Record<number, FilterQuestionsAnswersType> = {}
): Promise<any> => {
  const formData = new FormData();

  // Add basic booking data
  formData.append('timeslot_id', timeslotId.toString());
  formData.append('purpose', purpose || '');

  // Process answers if any
  const hasAnswers = Object.keys(answers).length > 0;

  if (hasAnswers) {
    // Create a clean object for JSON serialization
    const answersForJson: Record<string, any> = {};

    Object.entries(answers).forEach(([questionId, answer]) => {
      if (answer instanceof File) {
        // Handle file upload
        console.log('Adding file: ', answer.name, 'Size:', answer.size, 'bytes');
        const fieldName = `file_${questionId}`;
        formData.append(fieldName, answer);
        answersForJson[questionId] = { type: 'file', fieldName };
      } else if (answer !== null && answer !== undefined) {
        // Handle text answers
        formData.append(`answer_${questionId}`, answer.toString());
        answersForJson[questionId] = { type: 'text', value: answer.toString() };
      }
    });

    // Add structured answers as JSON for easier processing on server
    formData.append('answersJSON', JSON.stringify(answersForJson));
  }

  // Make API request with token but without Content-Type header (browser sets it for FormData)
  const token = getLocalToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers['authorization_token'] = token;
  }

  const response = await fetch(`${API_BASE_URL}/bookings/user/request`, {
    method: 'POST',
    headers,
    body: formData
  });

  // Clone response for multiple reads if needed
  const responseClone = response.clone();

  if (!response.ok) {
    let errorMessage = `API request failed with status ${response.status}`;
    try {
      const errorData = await responseClone.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      try {
        const errorText = await response.text();
        if (errorText) {
          errorMessage = errorText;
        }
      } catch (textError) {
        errorMessage = response.statusText || errorMessage;
      }
    }
    throw new Error(errorMessage);
  }

  try {
    return await response.json();
  } catch (e) {
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
    let url = `/infrastructures/user-guest/${infrastructureId}/available-timeslots`;

    if (params?.date) {
      url += `?date=${params.date}`;
    }

    return apiRequest(url);
  };

/**
 * Create timeslots (admin only)
 */
export const createTimeslots =
  (data: BatchCreationPayload): Promise<{ message: string, created: number, skipped: number }> => {
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
export const fetchUsers = (): Promise<User[]> => {
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
export const fetchUserInfrastructures = (userId: number): Promise<Infrastructure[]> => {
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
 * Fetch all filter-questions for an infrastructure.
 * Default return value is that of guests.
 */
export const fetchInfrastructureQuestions = (infrastructureId: number): Promise<FilterQuestionData[]> => {
  const user = getLocalUser();
  if (user) {

    const role = user.role;
    if (role === "admin" || role === "manager") {
      return apiRequest(`/infrastructures/manager-admin/${infrastructureId}/questions`);
    }
  }
  return apiRequest(`/infrastructures/user-guest/${infrastructureId}/questions`);
};

/**
 * Create or update a question
 */
export const saveInfrastructureQuestion = (questionData: FilterQuestionData) => {
  const createNew = questionData.id < 0;
  let method: string;
  let endpoint: string;
  if (createNew) {
    method = 'POST';
    endpoint = `/infrastructures/manager-admin/${questionData.infrastructure_id}/questions`;
  } else {
    method = 'PUT';
    endpoint = `/infrastructures/manager-admin/${questionData.infrastructure_id}/questions/${questionData.id}`
  }
  return apiRequest(endpoint, { method, body: JSON.stringify(questionData) });
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
export const fetchEmailPreferences = async ():
  Promise<{ success: boolean, message: string, email_notifications?: boolean }> => {
  return apiRequest('/preferences/user-manager/email');
};

/**
 * Update email notification preferences for current user
 * @param enabled - Boolean indicating if email notifications should be enabled
 * @returns Promise with updated preferences
 */
export const updateEmailPreferences = async (enabled: boolean):
  Promise<{ success: boolean, message?: string }> => {
  return apiRequest('/preferences/user-manager/email', {
    method: 'PUT',
    body: JSON.stringify({ email_notifications: enabled }),
  });
};

/**
 * Process an email action (approve/reject) from an email link
 * @param action - The action to perform ('approve' or 'reject')
 * @param token - The secure token from the email link
 * @returns Promise with action result
 */
export const processEmailAction = async (action: 'approve' | 'reject', token: string) => {
  try {
    // This endpoint doesn't use the apiRequest helper because it doesn't require authentication
    const response = await fetch(`${API_BASE_URL}/email-action/${action}/${token}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Email action failed with status ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Unsubscribe from emails using the public endpoint (no authentication required).
 * For unsubscribtion-links sent in emails.
 * @param email - User email to unsubscribe
 * @returns Promise with unsubscribe result
 */
export const unsubscribeEmailAction = async (email: string) => {
  try {
    // This endpoint doesn't use the apiRequest helper because it doesn't require authentication
    const response = await fetch(`${API_BASE_URL}/preferences/user-manager/unsubscribe/${encodeURIComponent(email)}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Unsubscribe request failed with status ${response.status}`);
    }
    // This is an HTML response, so we just return success
    return { success: true };
  } catch (error) {
    throw error;
  }
};

/**
 * Get the booking-details of a booking.
 * @param bookingId ID of the requested booking
 * @returns Promise with a BookingDetails object of the relevant bookings (or an error).
 */
export const fetchBookingDetails = async (bookingId: number): Promise<BookingDetails> => {
  const data = await apiRequest<BookingDetails>(`/bookings/${bookingId}/details`);
  return data;
};

export const downloadBookingDocument = async (bookingId: string, questionId: string) => {
  const data = await apiRequest<void>(`${API_BASE_URL}/bookings/download-file/${bookingId}/${questionId}`);
  return data;
};

/**
 * Initiate a guest booking request
 * @param email - Guest email address
 * @param name - Guest name
 * @param infrastructureId - ID of the selected infrastructure
 * @param timeslotId - ID of the selected timeslot
 * @param purpose - Purpose of the booking (optional)
 * @param answers - Answers to infrastructure questions (optional)
 * @returns Promise with the response data
 */
export const requestGuestBooking = async (
  name: string,
  email: string,
  infrastructureId: number,
  timeslotId: number,
  purpose: string = '',
  answers: Record<string, any> = {}
): Promise<{ success: boolean, message: string, data?: any }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/guest/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        name,
        infrastructureId,
        timeslotId,
        purpose,
        answers
      }),
    });

    const data = await response.json();

    return {
      success: response.ok,
      message: data.message || (response.ok
        ? 'Booking verification email sent! Please check your inbox to confirm your booking.'
        : 'Failed to process booking request'),
      data: response.ok ? data : null
    };
  } catch (error) {
    console.error('Error initiating guest booking:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'An error occurred while processing your booking'
    };
  }
};

export const processGuestConfirmation = async (token: string) => {
  try {
    // This endpoint doesn't use the apiRequest helper because it doesn't require authentication
    const response = await fetch(`${API_BASE_URL}/guest/confirm-booking/${token}`);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Guest confirmation failed with status ${response.status}`);
    }
    return { success: true };
  } catch (error) {
    throw error;
  };
};

/**
 * Directly download a file from the booking system
 * @param bookingId - ID of the booking containing the file
 * @param questionId - ID of the question/document to download
 * @param filename - Optional filename to use for the downloaded file
 * @returns Promise that resolves when download is initiated
 */
export const downloadBookingFile = async (
  bookingId: number | string,
  questionId: number | string,
  filename?: string
): Promise<void> => {
  const token = getLocalToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  try {
    // Make authenticated request with correct header format
    const response = await fetch(`${API_BASE_URL}/bookings/download-file/${bookingId}/${questionId}`, {
      headers: {
        'authorization_token': token
      }
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.status}`);
    }

    // Get suggested filename from Content-Disposition header if available
    let suggestedFilename = filename;
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/);
      if (filenameMatch && filenameMatch[1]) {
        suggestedFilename = decodeURIComponent(filenameMatch[1]);
      }
    }

    // Fall back to default filename if none provided
    const downloadFilename = suggestedFilename || `document_${bookingId}_${questionId}.pdf`;

    // Create and trigger download using Blob
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = downloadFilename;
    document.body.appendChild(a);
    a.click();

    // Clean up
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
  } catch (error) {
    console.error('Download error:', error);
    throw error;
  }
};