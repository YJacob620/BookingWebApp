import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import * as RoutePaths from '@/RoutePaths';
import LoginPage from '@/_LoginEtc/LoginPage.tsx';
import AdminDashboard from '@/_Admin/AdminDashboard.tsx';
import InfrastructureManagement from '@/_Manager_Admin/InfrastructureManagement.tsx';
import BookingManagement from '@/_Manager_Admin/BookingManagement.tsx';
import BookTimeslot from '@/_User/BookTimeslot';
import UserDashboard from '@/_User/UserDashboard.tsx';
import BookingHistory from '@/_User/UserBookingHistory.tsx';
import RegistrationPage from '@/_LoginEtc/RegistrationPage.tsx';
import EmailVerificationPage from '@/_LoginEtc/EmailVerificationPage.tsx';
import VerificationPendingPage from '@/_LoginEtc/VerificationPendingPage.tsx';
import ForgotPasswordPage from '@/_LoginEtc/ForgotPasswordPage.tsx';
import ResetPasswordPage from '@/_LoginEtc/ResetPasswordPage.tsx';
import UserManagement from '@/_Admin/UserManagement.tsx';
import ManagerDashboard from '@/_Manager/ManagerDashboard.tsx';
import AuthenticationGuard from '@/components/_AuthenticationGuard.tsx';
import EmailActionHandler from '@/_Manager/EmailActionHandler.tsx';
import EmailUnsubscribePage from '@/_User_Manager/EmailUnsubscribePage.tsx';
import FileDownloadHandler from '@/_All/FileDownloadHandler.tsx';
import GuestConfirmationPage from '@/_User/GuestConfirmationPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes (no authentication required) */}
        <Route
          path={RoutePaths.LOGIN}
          element={
            <AuthenticationGuard>
              <LoginPage />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.REGISTER}
          element={
            <AuthenticationGuard>
              <RegistrationPage />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.VERIFICATION_PENDING}
          element={
            <AuthenticationGuard>
              <VerificationPendingPage />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.FORGOT_PASSWORD}
          element={
            <AuthenticationGuard>
              <ForgotPasswordPage />
            </AuthenticationGuard>
          }
        />

        {/* Unsubscribe route - no authentication required */}
        <Route
          path={RoutePaths.UNSUBSCRIBE}
          element={<EmailUnsubscribePage />}
        />

        {/* Token-based Routes */}
        <Route
          path={RoutePaths.VERIFY_EMAIL}
          element={
            <AuthenticationGuard tokenParams={{ paramName: "token" }}>
              <EmailVerificationPage />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.RESET_PASSWORD}
          element={
            <AuthenticationGuard tokenParams={{ paramName: "token" }}>
              <ResetPasswordPage />
            </AuthenticationGuard>
          }
        />

        {/* Admin Routes */}
        <Route
          path={RoutePaths.ADMIN_DASHBOARD}
          element={
            <AuthenticationGuard requiredRoles={['admin']}>
              <AdminDashboard />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.INFRASTRUCTURE_MANAGEMENT}
          element={
            <AuthenticationGuard requiredRoles={['admin']}>
              <InfrastructureManagement />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.BOOKING_MANAGEMENT}
          element={
            <AuthenticationGuard requiredRoles={['admin', 'manager']}>
              <BookingManagement />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.USER_MANAGEMENT}
          element={
            <AuthenticationGuard requiredRoles={['admin']}>
              <UserManagement />
            </AuthenticationGuard>
          }
        />

        {/* User Routes */}
        <Route
          path={RoutePaths.USER_DASHBOARD}
          element={
            <AuthenticationGuard requiredRoles={['faculty', 'student']}>
              <UserDashboard />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.CREATE_BOOKING}
          element={
            <AuthenticationGuard requiredRoles={['faculty', 'student', 'guest']}>
              <BookTimeslot />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.BOOKING_HISTORY}
          element={
            <AuthenticationGuard requiredRoles={['faculty', 'student']}>
              <BookingHistory />
            </AuthenticationGuard>
          }
        />

        {/* Infrastructure Manager Routes */}
        <Route
          path={RoutePaths.MANAGER_DASHBOARD}
          element={
            <AuthenticationGuard requiredRoles={['manager']}>
              <ManagerDashboard />
            </AuthenticationGuard>
          }
        />
        <Route
          path={RoutePaths.MANAGER_INFRASTRUCTURE_MANAGEMENT}
          element={
            <AuthenticationGuard requiredRoles={['manager']}>
              <InfrastructureManagement />
            </AuthenticationGuard>
          }
        />

        <Route
          path={RoutePaths.EMAIL_ACTION_HANDLER}
          element={
            <EmailActionHandler />
          }
        />

        {/* Shared routes for both Admin and Manager */}
        <Route
          path={RoutePaths.MANAGER_BOOKINGS}
          element={
            <AuthenticationGuard requiredRoles={['admin', 'manager']}>
              <BookingManagement />
            </AuthenticationGuard>
          }
        />

        <Route
          path={`${RoutePaths.DOWNLOAD_BOOKINGS_DOC}/:bookingId/:questionId`}
          element={
            <AuthenticationGuard requiredRoles={['admin', 'manager', 'faculty', 'student']}>
              <FileDownloadHandler />
            </AuthenticationGuard>
          }
        />

        <Route
          path={RoutePaths.GUEST_CONFIRMATION}
          element={<GuestConfirmationPage />}
        />

        {/* Redirect root path to login */}
        <Route path="/" element={<Navigate to={RoutePaths.LOGIN} />} />

        {/* Catch all route - Redirect to login */}
        <Route path="*" element={<Navigate to={RoutePaths.LOGIN} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;