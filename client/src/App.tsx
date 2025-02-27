import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import InfrastructureManagement from './InfrastructureManagement.tsx';
import BookingManagement from './BookingManagement.tsx';
import CreateBooking from './User/UserCreateBooking.tsx';
import UserDashboard from './User/UserDashboard.tsx';
import BookingHistory from './User/UserBookingHistory.tsx';
import RegistrationPage from './RegistrationEtc/RegistrationPage.tsx';
import EmailVerificationPage from './RegistrationEtc/EmailVerificationPage.tsx';
import VerificationPendingPage from './RegistrationEtc/VerificationPendingPage.tsx';
import ForgotPasswordPage from './RegistrationEtc/ForgotPasswordPage.tsx';
import ResetPasswordPage from './RegistrationEtc/ResetPasswordPage.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
        <Route path="/verify-email/:token" element={<EmailVerificationPage />} />
        <Route path="/verification-pending" element={<VerificationPendingPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* Admin Routes */}
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/infrastructure-management" element={<InfrastructureManagement />} />
        <Route path="/booking-management" element={<BookingManagement />} />

        {/* User Routes */}
        <Route path="/user-dashboard" element={<UserDashboard />} />
        <Route path="/create-booking" element={<CreateBooking />} />
        <Route path="/booking-history" element={<BookingHistory />} />

        {/* Redirect root path to login */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Catch all route - Redirect to login */}
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;