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

// User routes
export const USER_DASHBOARD = '/user-dashboard';
export const CREATE_BOOKING = '/create-booking';
export const BOOKING_HISTORY = '/booking-history';

// // Helper functions for parameterized routes
// export const getVerifyEmailPath = (token: string) =>
//     VERIFY_EMAIL.replace(':token', token);

// export const getResetPasswordPath = (token: string) =>
//     RESET_PASSWORD.replace(':token', token);