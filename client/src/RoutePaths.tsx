// Authentication routes
export const LOGIN = '/login';
export const REGISTER = '/register';
export const VERIFY_EMAIL = '/verify-email/:token';
export const VERIFICATION_PENDING = '/verification-pending';
export const FORGOT_PASSWORD = '/forgot-password';
export const RESET_PASSWORD = '/reset-password/:token';
export const UNSUBSCRIBE = '/preferences/user-manager/unsubscribe/:email';

// Admin routes
export const ADMIN_DASHBOARD = '/admin-dashboard';
export const INFRASTRUCTURE_MANAGEMENT = '/infrastructure-management';
export const BOOKING_MANAGEMENT = '/booking-management';
export const USER_MANAGEMENT = '/user-management';

// User routes
export const USER_DASHBOARD = '/user-dashboard';
export const CREATE_BOOKING = '/create-booking';
export const BOOKING_HISTORY = '/booking-history';

// Infrastructure Manager routes
export const MANAGER_DASHBOARD = '/manager-dashboard';
export const MANAGER_INFRASTRUCTURE_MANAGEMENT = '/manager-infrastructure-management';
export const MANAGER_BOOKINGS = '/manager-bookings/:infrastructureId';
export const EMAIL_ACTION_CONFIRMATION = '/email-action-confirmation';
export const EMAIL_ACTION_HANDLER = '/email-action/:action/:token';

// For-all routes
export const DOWNLOAD_BOOKINGS_DOC = '/bookings/download-file';

// Helper functions for parameterized routes
export const getVerifyEmailPath = (token: string) =>
    VERIFY_EMAIL.replace(':token', token);

export const getResetPasswordPath = (token: string) =>
    RESET_PASSWORD.replace(':token', token);

export const getManagerBookingsPath = (infrastructureId: number) =>
    MANAGER_BOOKINGS.replace(':infrastructureId', infrastructureId.toString());

export const getUnsubscribePath = (email: string) =>
    UNSUBSCRIBE.replace(':email', email);