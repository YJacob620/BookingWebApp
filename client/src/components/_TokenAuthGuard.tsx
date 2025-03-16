import React, { ReactNode, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { userRoleAuthentication } from '@/userRoleAuth';
import { Spinner } from '@/components/ui/spinner';
import { getDashboardPath, isLocalUserDataValid } from '@/_utils/authUtils';

interface TokenAuthGuardProps {
  // Component or content to render
  children: ReactNode;

  // Name of the token parameter in the URL (e.g., 'token')
  tokenParamName?: string;

  // Whether token is in URL params (/:token) or query string (?token=)
  tokenInParams?: boolean;

  // Custom loading component (optional)
  loadingComponent?: ReactNode;

  // Page title
  pageTitle?: string;
}

/**
 * TokenAuthGuard - Specialized guard for token-based auth flows
 * 
 * This component is designed for pages that work with auth tokens
 * like email verification, password reset, etc. It prevents logged-in
 * users from accessing these pages (avoiding security issues).
 */
const TokenAuthGuard: React.FC<TokenAuthGuardProps> = ({
  children,
  tokenParamName = 'token',
  tokenInParams = true,
  loadingComponent,
  pageTitle
}) => {
  const navigate = useNavigate();
  const params = useParams();
  const location = useLocation();
  const { isAdmin, isManager, isLoading } = userRoleAuthentication();

  // Get token from URL (either params or query string)
  const getToken = (): string | null => {
    if (tokenInParams) {
      return params[tokenParamName] || null;
    } else {
      const searchParams = new URLSearchParams(location.search);
      return searchParams.get(tokenParamName);
    }
  };

  const token = getToken();

  useEffect(() => {
    // Don't do anything while still loading auth state
    if (isLoading) return;

    // Check if user is already logged in with valid data
    const isLoggedIn = isLocalUserDataValid();

    if (isLoggedIn) {
      // User is already logged in, redirect to their dashboard
      navigate(getDashboardPath(isAdmin, isManager));
      return;
    }

    // Check if token is missing (and required)
    if (!token) {
      console.error('Missing required token parameter');
      navigate('/login');
      return;
    }

    // Token exists and user is not logged in, allow access to the page
    // The page component will handle token validation logic

  }, [isLoading, isAdmin, isManager, navigate, token]);

  // Apply page title if provided
  if (pageTitle) {
    document.title = pageTitle;
  }

  // Show loading state
  if (isLoading) {
    return loadingComponent || (
      <div className="min-h-screen general-container flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" />
          <div className="text-xl">Loading...</div>
        </div>
      </div>
    );
  }

  // Don't render if user is logged in (will redirect in useEffect)
  const isLoggedIn = isLocalUserDataValid();
  if (isLoggedIn) {
    return null;
  }

  // Don't render if token is missing (will redirect in useEffect)
  if (!token) {
    return null;
  }

  // Render the content with the token
  return <>{children}</>;
};

export default TokenAuthGuard;
