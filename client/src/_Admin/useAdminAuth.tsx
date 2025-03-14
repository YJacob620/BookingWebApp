import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { verifyAdmin } from '@/_utils';
import { LOGIN } from '@/RoutePaths';


export const useAdminAuth = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthorized) {
      console.warn("ADMIN AUTHORIZED");
    }
  }, [isAuthorized]);

  useEffect(() => {
    const checkAdminAuthorization = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('No authentication token found');
        }
        const isAdminVerified = await verifyAdmin();
        if (!isAdminVerified) {
          throw new Error('Not authorized as admin');
        }
        setIsAuthorized(true);
      } catch (error) {
        if (error instanceof Error) {
          console.error('Authorization error:', error.message);
        } else {
          console.error('Authorization error:', 'Unknown error occurred');
        }
        navigate(LOGIN);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAuthorization();

  }, [navigate]);

  return { isAuthorized, isLoading };
};