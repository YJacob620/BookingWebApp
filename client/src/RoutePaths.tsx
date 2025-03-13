// Authentication routes
export const LOGIN = '/login';
export const REGISTER = '/register';
export const VERIFY_EMAIL = '/verify-email/:token';
export const VERIFICATION_PENDING = '/verification-pending';
export const FORGOT_PASSWORD = '/forgot-password';
export const RESET_PASSWORD = '/reset-password/:token';

// Admin routes
export const ADMIN_DASHBOARD = '/admin-dashboard';
export const INFRASTRUCTURE_MANAGEMENT = '/infrastructure-management';
export const BOOKING_MANAGEMENT = '/booking-management';
export const USER_MANAGEMENT = '/user-management';
export const INFRASTRUCTURE_QUESTIONS = '/infrastructure-questions';
export const INFRASTRUCTURE_QUESTIONS_DETAIL = '/infrastructure-questions/:infrastructureId';

// User routes
export const USER_DASHBOARD = '/user-dashboard';
export const CREATE_BOOKING = '/create-booking';
export const BOOKING_HISTORY = '/booking-history';

// // Helper functions for parameterized routes
// export const getVerifyEmailPath = (token: string) =>
//     VERIFY_EMAIL.replace(':token', token);

// export const getResetPasswordPath = (token: string) =>
//     RESET_PASSWORD.replace(':token', token);

// Infrastructure Manager routes
export const MANAGER_DASHBOARD = '/manager-dashboard';
export const MANAGER_BOOKINGS = '/manager-bookings/:infrastructureId';
export const MANAGER_TIMESLOTS = '/manager-timeslots/:infrastructureId';
export const MANAGER_INFRASTRUCTURE_QUESTIONS = '/manager-infrastructure/:infrastructureId/questions';