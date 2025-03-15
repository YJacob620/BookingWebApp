import { NavigateFunction } from 'react-router-dom';
import { ADMIN_DASHBOARD, MANAGER_DASHBOARD, USER_DASHBOARD, LOGIN } from '@/RoutePaths';

/**
 * Smart navigation utility that redirects based on user authentication state and role
 * @param navigate - React Router's navigate function
 * @param currentPath - Optional current path to avoid redundant navigation
 * @returns void
 */
export const smartNavigate = (navigate: NavigateFunction, currentPath?: string): void => {
  // Get the current user from localStorage
  const userString = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  // If no user data or token, redirect to login
  if (!userString || !token) {
    if (currentPath !== LOGIN) {
      navigate(LOGIN);
    }
    return;
  }

  try {
    const user = JSON.parse(userString);
    let targetPath = LOGIN; // Default fallback

    // Determine target path based on user role
    switch (user.role) {
      case 'admin':
        targetPath = ADMIN_DASHBOARD;
        break;
      case 'manager':
        targetPath = MANAGER_DASHBOARD;
        break;
      case 'faculty':
      case 'student':
      case 'guest':
        targetPath = USER_DASHBOARD;
        break;
      default:
        // Unrecognized role, clear localStorage and go to login
        console.error(`Unexpected user role: ${user.role}`);
        localStorage.clear();
        navigate(LOGIN);
        return;
    }

    // Only navigate if we're not already on the target path
    if (currentPath !== targetPath) {
      navigate(targetPath);
    }
  } catch (error) {
    console.error('Error parsing user data:', error);
    localStorage.clear(); // Clear potentially corrupted data
    navigate(LOGIN);
  }
};

/**
 * Check if a user is authenticated and has a specific role
 * @param requiredRole - The role to check for (optional)
 * @returns Boolean indicating if the user is authenticated and has the required role
 */
export const checkAuth = (requiredRole?: string): boolean => {
  const userString = localStorage.getItem('user');
  const token = localStorage.getItem('token');

  if (!userString || !token) {
    return false;
  }

  try {
    const user = JSON.parse(userString);

    // If no specific role is required, just check if authenticated
    if (!requiredRole) {
      return true;
    }

    // Check if user has the required role
    return user.role === requiredRole;
  } catch (error) {
    console.error('Error parsing user data:', error);
    return false;
  }
};

/**
 * Get the authenticated user from localStorage
 * @returns The user object or null if not authenticated
 */
export const getAuthUser = () => {
  const userString = localStorage.getItem('user');

  if (!userString) {
    return null;
  }

  try {
    return JSON.parse(userString);
  } catch (error) {
    console.error('Error parsing user data:', error);
    return null;
  }
};