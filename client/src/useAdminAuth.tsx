import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { verifyAdmin } from '@/utils';


export const useAdminAuth = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminAuthorization = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        // Use the imported verifyAdmin utility
        const isAdminVerified = await verifyAdmin();

        if (isAdminVerified) {
          setIsAuthorized(true);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Authorization error:', error);
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAuthorization();
  }, [navigate]);

  return { isAuthorized, isLoading };
};