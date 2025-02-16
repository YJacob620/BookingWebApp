// import UserDashboard from './UserDashboard';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './LoginPage.tsx';
import AdminDashboard from './AdminDashboard.tsx';
import InfrastructureManagement from './InfrastructureManagement.tsx';
import TimeslotManagement from './TimeslotManagement.tsx';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboard />} />
        <Route path="/infrastructure-management" element={<InfrastructureManagement />} />
        <Route path="/time-slots-management" element={<TimeslotManagement />} />

        {/* Redirect root path to login */}
        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
