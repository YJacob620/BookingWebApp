/* Utilities for client-side authentication from localStorage (not from the server) */

import { NavigateFunction } from 'react-router-dom';
import { LOGIN, ADMIN_DASHBOARD, MANAGER_DASHBOARD, USER_DASHBOARD } from '@/RoutePaths';
import { User, USER_ROLES, UserRole } from '@/utils/types';

/**
 * Shared logout function that clears user data and optionally redirects
 * 
 * @param navigate - Optional navigate function for redirection to login page
 */
export const logout = (navigate?: NavigateFunction) => {
  localStorage.removeItem('user');
  localStorage.removeItem('token');

  if (navigate) {
    navigate(LOGIN);
  }
};

/**
 * Returns the relevant dashboard path based on the role of the current user.
 * @param userRole role of the current user 
 * @returns path to the relevant dashboard
 */
export const getDashboardPath = (
  userRole: UserRole
): string => {
  if (userRole === 'admin') return ADMIN_DASHBOARD;
  if (userRole === 'manager') return MANAGER_DASHBOARD;
  if (userRole === 'student' || userRole === 'faculty') return USER_DASHBOARD;
  if (USER_ROLES.includes(userRole)) {
    throw new Error(`"${userRole}" dashboard-redirection not implemented for this role!`);
  }
  throw new Error(`Invalid user role "${userRole}"`);
};

/**
 * Validates user data in localStorage
 * 
 * @param navigate - Optional navigate function for redirection on invalid data
 * @returns Whether user data is valid
 */
export const isLocalUserDataValid = (): boolean => {
  try {
    const userData = localStorage.getItem('user');
    const token = getLocalToken();

    if (!userData || !token) {
      return false;
    }

    // Try to parse user data to verify it's valid JSON and has required fields
    const parsed = JSON.parse(userData);
    const isValid = !!(parsed && parsed.id && parsed.email && parsed.role);

    return isValid;
  } catch (e) {
    console.error('Corrupted user data in localStorage', e);
    return false;
  }
};

/**
 * Get the currently logged in user from localStorage or null if there is no such user.
 * 
 * @returns The logged in user object (or null). 
 */
export const getLocalUser = (): User | null => {
  const userData = localStorage.getItem('user');
  if (!userData) {
    return null
  };

  try {
    return JSON.parse(userData) as User;
  } catch (e) {
    throw new Error(`Error parsing user data: ${e}`);
  }
};

/**
 * Get the token of the currently logged in user from localStorage
 * 
 * @returns The token as a string null if no user is logged in
 */
export const getLocalToken = (): string | null => {
  return localStorage.getItem('token');
};