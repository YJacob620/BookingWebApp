import React, { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { LOGIN } from '@/RoutePaths';
import { UserRole } from '@/utils';
import { getDashboardPath, getLocalToken } from '@/utils/localAuthUtils';
import { verifyAdmin, verifyManager, verifyUser } from '@/utils';
import { CREATE_BOOKING } from '@/RoutePaths';
import { useTranslation } from 'react-i18next';


interface TokenParams {
  // Name of the token parameter in URL (e.g., 'token')
  paramName: string;
  // Whether token is in URL params (/:token) or query string (?token=)
  inParams?: boolean;
}

interface AuthGuardProps {
  children: ReactNode;
  // For protected routes (role-based auth)
  requiredRoles?: UserRole[];
  // For token-based flows (email verification, password reset)
  tokenParams?: TokenParams;
  // Custom loading component
  loadingComponent?: ReactNode;
}

const AuthenticationGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRoles,
  tokenParams,
  loadingComponent
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const {t} = useTranslation()

  // Get token from URL if in token mode
  const getToken = (): string | null => {
    if (!tokenParams) return null;

    if (tokenParams.inParams !== false) {
      // Get from URL params (/:token)
      return params[tokenParams.paramName] || null;
    } else {
      // Get from query string (?token=...)
      const searchParams = new URLSearchParams(location.search);
      return searchParams.get(tokenParams.paramName);
    }
  };

  const token = getToken();

  useEffect(() => {
    const checkAuth = async () => {
      // CASE 1: TOKEN-BASED AUTH FLOW
      if (tokenParams) {
        // If no token present, redirect to login
        if (!token) {
          navigate(LOGIN);
          return;
        }

        // Check if user is already logged in (should not access token flows)
        const authToken = getLocalToken();
        if (authToken) {
          try {
            const userString = localStorage.getItem('user');
            if (userString) {
              const user = JSON.parse(userString);
              // Redirect to their dashboard
              navigate(getDashboardPath(user.role));
              return;
            }
          } catch (e) {
            // Clear invalid data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }

        // Allow access to token flow page
        setIsAuthorized(true);
        return;
      }

      // CASE 2: PUBLIC ROUTE (login, register)
      if (!requiredRoles) {
        const authToken = getLocalToken();
        if (authToken) {
          // User is already logged in, redirect to dashboard
          try {
            const userString = localStorage.getItem('user');
            if (userString) {
              const user = JSON.parse(userString);
              navigate(getDashboardPath(user.role));
              return;
            }
          } catch (e) {
            // Clear invalid data
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }

        // Allow access to public route
        setIsAuthorized(true);
        return;
      }

      // CASE 3: GUEST TRIES TO ACCESS BOOKING PAGE
      const isGuestMode = location.search.includes('guest=true');
      if (isGuestMode && location.pathname === CREATE_BOOKING) {
        // Allow access to booking page in guest mode without authentication
        setIsAuthorized(true);
        return;
      }

      // CASE 4: PROTECTED ROUTE (role-based auth)
      const authToken = getLocalToken();
      if (!authToken) {
        navigate(LOGIN);
        return;
      }

      // Check user role
      try {
        const userString = localStorage.getItem('user');
        if (!userString) {
          navigate(LOGIN);
          return;
        }

        const user = JSON.parse(userString);

        // Only perform server verification if we have the required role
        if (requiredRoles.includes(user.role)) {
          // Server-side verification based on role
          let isVerified = false;
          try {
            if (user.role === 'admin') {
              isVerified = await verifyAdmin();
            } else if (user.role === 'manager') {
              isVerified = await verifyManager();
            } else {
              isVerified = await verifyUser();
            }

            if (isVerified) {
              setIsAuthorized(true);
            } else {
              console.error('Server verification failed');
              localStorage.removeItem('token');
              localStorage.removeItem('user');
              navigate(LOGIN);
            }
          } catch (error) {
            console.error('Server verification error:', error);
            // Allow access on server error to prevent being locked out
            setIsAuthorized(true);
          }
        } else {
          // User doesn't have the required role, redirect to their dashboard
          navigate(getDashboardPath(user.role));
        }
      } catch (e) {
        console.error('Error checking auth:', e);
        navigate(LOGIN);
      }
    };

    checkAuth();

    // Listen for logout events
    const handleLogout = () => {
      navigate(LOGIN, { replace: true });
    };
    window.addEventListener('app:logout', handleLogout);

    return () => window.removeEventListener('app:logout', handleLogout);
  }, [navigate, requiredRoles, tokenParams, token, location.pathname]);

  // If still checking authorization, show loading
  if (isAuthorized === null) {
    return loadingComponent || (
      <div className="general-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          {/* <div className="text-xl">Loading...</div> */}
          <div className="text-xl">{t('Loading')}</div>
        </div>
      </div>
    );
  }

  // If authorized, render children
  return isAuthorized ? <>{children}</> : null;
};

export default AuthenticationGuard;