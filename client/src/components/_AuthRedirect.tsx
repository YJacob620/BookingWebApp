import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { checkAuth, smartNavigate } from '@/_utils/navigation';
import { UserRole } from '@/_utils';

interface AuthRedirectProps {
  requiredRole?: UserRole;
  children: React.ReactNode;
}

/**
 * A component that handles authentication and role-based redirects
 * Use this in pages that require authentication or specific roles
 */
const AuthRedirect: React.FC<AuthRedirectProps> = ({ requiredRole, children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // If a specific role is required, check for it
    if (requiredRole) {
      if (!checkAuth(requiredRole)) {
        smartNavigate(navigate, useLocation().pathname);
      }
    }
    // Otherwise just check if the user is authenticated
    else if (!checkAuth()) {
      smartNavigate(navigate, useLocation().pathname);
    }
  }, [navigate, location.pathname, requiredRole]);

  return <>{children}</>;
};

export default AuthRedirect;