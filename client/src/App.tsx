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
import InfrastructureQuestionsManager from './_Admin/InfrastructureQuestionsManager.tsx';
import InfrastructureQuestionsSelect from './_Admin/InfrastructureQuestionsSelect.tsx';
import ManagerDashboard from './_Manager/ManagerDashboard.tsx';


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication Routes */}
        <Route path={RoutePaths.LOGIN} element={<LoginPage />} />
        <Route path={RoutePaths.REGISTER} element={<RegistrationPage />} />
        <Route path={RoutePaths.VERIFY_EMAIL} element={<EmailVerificationPage />} />
        <Route path={RoutePaths.VERIFICATION_PENDING} element={<VerificationPendingPage />} />
        <Route path={RoutePaths.FORGOT_PASSWORD} element={<ForgotPasswordPage />} />
        <Route path={RoutePaths.RESET_PASSWORD} element={<ResetPasswordPage />} />

        {/* Admin Routes */}
        <Route path={RoutePaths.ADMIN_DASHBOARD} element={<AdminDashboard />} />
        <Route path={RoutePaths.INFRASTRUCTURE_MANAGEMENT} element={<InfrastructureManagement />} />
        <Route path={RoutePaths.BOOKING_MANAGEMENT} element={<BookingManagement />} />
        <Route path={RoutePaths.USER_MANAGEMENT} element={<UserManagement />} />
        <Route path={RoutePaths.INFRASTRUCTURE_QUESTIONS} element={<InfrastructureQuestionsSelect />} />
        <Route path={RoutePaths.INFRASTRUCTURE_QUESTIONS_DETAIL} element={<InfrastructureQuestionsManager />} />

        {/* User Routes */}
        <Route path={RoutePaths.USER_DASHBOARD} element={<UserDashboard />} />
        <Route path={RoutePaths.CREATE_BOOKING} element={<BookTimeslot />} />
        <Route path={RoutePaths.BOOKING_HISTORY} element={<BookingHistory />} />

        {/* Infrastructure Manager Routes */}
        <Route path={RoutePaths.MANAGER_DASHBOARD} element={<ManagerDashboard />} />
        <Route path={RoutePaths.MANAGER_INFRASTRUCTURE_QUESTIONS} element={<InfrastructureQuestionsManager />} />

        {/* Redirect root path to login */}
        <Route path="/" element={<Navigate to={RoutePaths.LOGIN} />} />

        {/* Catch all route - Redirect to login */}
        <Route path="*" element={<Navigate to={RoutePaths.LOGIN} />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;