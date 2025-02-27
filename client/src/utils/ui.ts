/**
 * Get CSS class for status badge based on booking status
 * @param status - Status string
 * @returns CSS class string for the badge
 */
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-700 text-yellow-100';
    case 'approved':
      return 'bg-green-700 text-green-100';
    case 'rejected':
      return 'bg-red-700 text-red-100';
    case 'completed':
      return 'bg-blue-700 text-blue-100';
    case 'expired':
      return 'bg-gray-700 text-gray-100';
    case 'canceled':
      return 'bg-purple-700 text-purple-100';
    case 'available':
      return 'bg-blue-700 text-blue-100';
    default:
      return 'bg-gray-700 text-gray-100';
  }
};

/**
 * Format status string for display (capitalize first letter)
 * @param type - Item type ('timeslot' or 'booking')
 * @param status - Status string
 * @returns Formatted status string
 */
export const formatStatus = (type: string, status: string): string => {
  if (type === 'timeslot' && status === 'available') return 'Available';
  return status.charAt(0).toUpperCase() + status.slice(1);
};

/**
 * Get filter options for booking status dropdown
 * @param includeAll - Whether to include 'All Statuses' option
 * @returns Array of status options
 */
export const getBookingStatusOptions = (includeAll: boolean = true): { value: string, label: string }[] => {
  const statuses: { value: string, label: string }[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'completed', label: 'Completed' },
    { value: 'canceled', label: 'Canceled' }
  ];
  if (includeAll) {
    return [{ value: 'all', label: 'All Statuses' }, ...statuses];
  }
  return statuses;
};

/**
 * Get filter options for timeslot status dropdown
 * @param includeAll - Whether to include 'All Statuses' option
 * @returns Array of status options
 */
export const getTimeslotStatusOptions = (includeAll: boolean = true): { value: string, label: string }[] => {
  const statuses: { value: string, label: string }[] = [
    { value: 'available', label: 'Available' },
    { value: 'canceled', label: 'Canceled' },
    { value: 'expired', label: 'Expired' }
  ];
  if (includeAll) {
    return [{ value: 'all', label: 'All Statuses' }, ...statuses];
  }
  return statuses;
};

/**
 * Get date filter options for dropdowns
 * @returns Array of date filter options
 */
export const getDateFilterOptions = (): { value: string, label: string }[] => {
  return [
    { value: 'all', label: 'All Dates' },
    { value: 'today', label: 'Today' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'past', label: 'Past' }
  ];
};
