import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import * as RoutePaths from './RoutePaths';

import LoginPage from './LoginPage.tsx';
import AdminDashboard from './_Admin/AdminDashboard.tsx';
import InfrastructureManagement from './_Admin/InfrastructureManagement.tsx';
import BookingManagement from './_Admin/BookingManagement.tsx';
import BookTimeslot from './_User/UserBookTimeslot.tsx';
import UserDashboard from './_User/UserDashboard.tsx';
import BookingHistory from './_User/UserBookingHistory.tsx';
import RegistrationPage from './_RegistrationEtc/RegistrationPage.tsx';
import EmailVerificationPage from './_RegistrationEtc/EmailVerificationPage.tsx';
import VerificationPendingPage from './_RegistrationEtc/VerificationPendingPage.tsx';
import ForgotPasswordPage from './_RegistrationEtc/ForgotPasswordPage.tsx';
import ResetPasswordPage from './_RegistrationEtc/ResetPasswordPage.tsx';
import UserManagement from './_Admin/UserManagement.tsx';
import ManagerDashboard from './_Manager/ManagerDashboard.tsx';
import AuthGuard from './components/_AuthGuard.tsx';
import TokenAuthGuard from './components/_TokenAuthGuard.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes - Authentication Check with Redirection */}
        <Route
          path={RoutePaths.LOGIN}
          element={
            <AuthGuard>
              <LoginPage />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.REGISTER}
          element={
            <AuthGuard>
              <RegistrationPage />
            </AuthGuard>
          }
        />

        {/* Token-based auth flow routes */}
        <Route
          path={RoutePaths.VERIFY_EMAIL}
          element={
            <TokenAuthGuard tokenParamName="token" pageTitle="Email Verification">
              <EmailVerificationPage />
            </TokenAuthGuard>
          }
        />
        <Route
          path={RoutePaths.VERIFICATION_PENDING}
          element={
            <AuthGuard>
              <VerificationPendingPage />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.FORGOT_PASSWORD}
          element={
            <AuthGuard>
              <ForgotPasswordPage />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.RESET_PASSWORD}
          element={
            <TokenAuthGuard tokenParamName="token" pageTitle="Reset Password">
              <ResetPasswordPage />
            </TokenAuthGuard>
          }
        />

        {/* Admin Routes */}
        <Route
          path={RoutePaths.ADMIN_DASHBOARD}
          element={
            <AuthGuard requiredRoles={['admin']}>
              <AdminDashboard />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.INFRASTRUCTURE_MANAGEMENT}
          element={
            <AuthGuard requiredRoles={['admin']}>
              <InfrastructureManagement />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.BOOKING_MANAGEMENT}
          element={
            <AuthGuard requiredRoles={['admin']}>
              <BookingManagement />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.USER_MANAGEMENT}
          element={
            <AuthGuard requiredRoles={['admin']}>
              <UserManagement />
            </AuthGuard>
          }
        />

        {/* User Routes */}
        <Route
          path={RoutePaths.USER_DASHBOARD}
          element={
            <AuthGuard requiredRoles={['faculty', 'student']}>
              <UserDashboard />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.CREATE_BOOKING}
          element={
            <AuthGuard requiredRoles={['faculty', 'student']}>
              <BookTimeslot />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.BOOKING_HISTORY}
          element={
            <AuthGuard requiredRoles={['faculty', 'student']}>
              <BookingHistory />
            </AuthGuard>
          }
        />

        {/* Infrastructure Manager Routes */}
        <Route
          path={RoutePaths.MANAGER_DASHBOARD}
          element={
            <AuthGuard requiredRoles={['manager']}>
              <ManagerDashboard />
            </AuthGuard>
          }
        />
        <Route
          path={RoutePaths.MANAGER_INFRASTRUCTURE_MANAGEMENT}
          element={
            <AuthGuard requiredRoles={['manager']}>
              <InfrastructureManagement />
            </AuthGuard>
          }
        />

        {/* Shared routes for both Admin and Manager */}
        <Route
          path={RoutePaths.MANAGER_BOOKINGS}
          element={
            <AuthGuard requiredRoles={['admin', 'manager']}>
              <BookingManagement />
            </AuthGuard>
          }
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