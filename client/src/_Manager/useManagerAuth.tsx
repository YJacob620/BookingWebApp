import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { verifyManager } from '@/_utils';
import { LOGIN } from '@/RoutePaths';

export const useManagerAuth = () => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthorized) {
            console.warn("MANAGER AUTHORIZED");
        }
    }, [isAuthorized]);

    useEffect(() => {
        const checkManagerAuthorization = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    throw new Error('No authentication token found');
                }
                const isManagerVerified = await verifyManager();
                if (!isManagerVerified) {
                    throw new Error('Not authorized as infrastructure manager');
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

        checkManagerAuthorization();
    }, [navigate]);

    return { isAuthorized, isLoading };
};