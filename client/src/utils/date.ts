/* Date related funcitons */

/**
 * Formats a date into a localized date format
 * @param dateString - ISO date string (YYYY-MM-DD) or a Date object
 * @returns Formatted date string
 */
export const formatDate = (dateString: string | Date, lng: string = 'en'): string => {
  const date = new Date(dateString);
  const formattedDate = date.toLocaleDateString('en-UK', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
  const weekday = date.toLocaleDateString(lng, { weekday: 'long' });
  // return `${formattedDate} ${weekday}`;
  return `${formattedDate} ${weekday}`;
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
 * Checks if a booking is within 24 hours of current time
 * @param bookingDate - Booking date
 * @param startTime - Start time in format HH:MM:SS
 * @returns Boolean indicating if booking is within 24 hours
 */
export const isWithin24Hours = (bookingDate: Date, startTime: string): boolean => {
  const [hours, minutes, seconds] = startTime.split(":").map(Number);
  const bookingDateTime = new Date(bookingDate);
  bookingDateTime.setHours(hours, minutes, seconds, 0); // Set time explicitly

  const now = new Date();

  // Check for valid date object
  if (isNaN(bookingDateTime.getTime())) {
    console.error("Invalid date created from:", bookingDate, startTime);
    return true; // Fail safely
  }

  const differenceInHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
  return differenceInHours <= 24 && differenceInHours >= 0;
};


/**
 * Checks if end time is after start time
 * @param start - Start time in format HH:MM
 * @param end - End time in format HH:MM
 * @returns Boolean indicating if end time is after start time
 */
export const isEndTimeAfterStartTime = (start: string, end: string): boolean => {
  if (!isTimeFormatValid(start) || !isTimeFormatValid(end)) {
    throw new Error("Invalid time format. Expected HH:MM or HH:MM:SS.");
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