import React, { ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { userRoleAuthentication } from '@/userRoleAuth';
import { Spinner } from '@/components/ui/spinner';
import { logout, getDashboardPath, isLocalUserDataValid } from '@/_utils/authUtils';
import { UserRole } from '@/_utils';

interface AuthGuardProps {
  // Component or content to render when authorized
  children: ReactNode;

  // Required roles for access
  requiredRoles?: UserRole[];

  // Custom loading component (optional)
  loadingComponent?: ReactNode;

  // Whether this is a public route (like login page)
  isPublicRoute?: boolean;
}

/**
 * AuthGuard - Protects routes based on user authentication and role
 * This component handles authentication checks, authorization based on user roles,
 * loading states, and redirects for protected pages.
 */
const AuthGuard: React.FC<AuthGuardProps> = ({ children, requiredRoles }) => {
  const navigate = useNavigate();
  const { authenticatedRole, isLoading, error } = userRoleAuthentication();

  // Effect to handle authentication and authorization
  useEffect(() => {
    if (isLoading) return;
    if (error) {
      console.error(error);
      logout(navigate); // log out and redirect to login page
      return;
    }
    if (authenticatedRole) {
      if (requiredRoles) {
        // If the user does not have the required role, redirect to their dashboard
        if (!requiredRoles.includes(authenticatedRole)) {
          navigate(getDashboardPath(authenticatedRole));
          console.error("The user does not have the required role.");
        }
      } else {
        // If the route is public, AKA has no requiredRoles (i.e login page),
        // and a user is already logged in, redirect to their dashboard
        navigate(getDashboardPath(authenticatedRole));
        console.error("The user is logged in and should not access public routes.");
      }
    }
  }, [isLoading, authenticatedRole, error, navigate, requiredRoles]);

  // Show loading component/spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen general-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }
  // For protected routes, we need additional checks
  if (requiredRoles) {
    if (!isLocalUserDataValid()) {
      return null; // Don't render anything, will redirect in useEffect
    }

    // Don't render anything if user doesn't have required role
    const hasRequiredRole = authenticatedRole && requiredRoles.includes(authenticatedRole);
    if (!hasRequiredRole) {
      return null;
    }
  }

  // Render the protected content
  return <>{children}</>;
};

export default AuthGuard;