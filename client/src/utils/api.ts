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
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
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
    throw new Error(errorData.message || `Request failed with status ${response.status}`);
  }
  
  return response.json();
};

// Infrastructure API

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
export const createTimeslots = (data: {
  infrastructure_id: number,
  startDate: string,
  endDate: string,
  dailyStartTime: string,
  slotDuration: number,
  slotsPerDay: number,
}) => {
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
