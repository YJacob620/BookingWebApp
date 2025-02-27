/**
 * Formats a date string into a localized date format
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-UK', {
    weekday: 'long',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric'
  });
};

/**
 * Formats a time string into a localized time format
 * @param timeString - Time string in format HH:MM:SS
 * @returns Formatted time string (hours:minutes AM/PM)
 */
export const formatTimeString = (timeString: string): string => {
  if (!timeString) return '';
  const time = new Date(`1970-01-01T${timeString}`);
  return time.toLocaleTimeString('en-UK', {
    hour: 'numeric',
    minute: '2-digit'
  });
};

/**
 * Calculates duration in minutes between two time strings
 * @param startTime - Start time in format HH:MM:SS
 * @param endTime - End time in format HH:MM:SS
 * @returns Duration in minutes
 */
export const calculateDuration = (startTime: string, endTime: string): number => {
  const start = new Date(`1970-01-01T${startTime}`);
  const end = new Date(`1970-01-01T${endTime}`);
  return (end.getTime() - start.getTime()) / 60000;
};

/**
 * Converts time string to minutes since midnight
 * @param time - Time string in format HH:MM
 * @returns Minutes since midnight
 */
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Checks if a booking is within 24 hours of current time
 * @param bookingDate - Booking date in format YYYY-MM-DD
 * @param startTime - Start time in format HH:MM:SS
 * @returns Boolean indicating if booking is within 24 hours
 */
export const isWithin24Hours = (bookingDate: string, startTime: string): boolean => {
  const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
  const now = new Date();

  // Check for valid date object
  if (isNaN(bookingDateTime.getTime())) {
    console.error("Invalid date created from:", bookingDate, startTime);
    return true; // Fail safely - treat invalid dates as within 24 hours to prevent cancellation
  }

  const differenceInHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return differenceInHours <= 24;
};

/**
 * Checks if end time is after start time
 * @param start - Start time in format HH:MM
 * @param end - End time in format HH:MM
 * @returns Boolean indicating if end time is after start time
 */
export const isEndTimeAfterStartTime = (start: string, end: string): boolean => {
  if (!isTimeFormatValid(start) || !isTimeFormatValid(end)) {
    return false;
  }
  const startDate = new Date(`1970-01-01T${start}`);
  const endDate = new Date(`1970-01-01T${end}`);
  return endDate > startDate;
};

/**
 * Validates time format (HH:MM)
 * @param time - Time string to validate
 * @returns Boolean indicating if time format is valid
 */
export const isTimeFormatValid = (time: string): boolean => {
  return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};
