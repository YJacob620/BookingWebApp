import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { verifyAdmin, verifyManager } from '@/_utils/apiAndAuth';
import { getAuthUser, smartNavigate } from '@/_utils/navigation';
import { LOGIN } from '@/RoutePaths';

export const useRoleAuth = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                // Get user from our new utility
                const user = getAuthUser();
                if (!user) {
                    setError('User not found');
                    setIsLoading(false);
                    // Redirect to login
                    if (location.pathname !== LOGIN) {
                        navigate(LOGIN);
                    }
                    return;
                }

                // Check permissions based on role
                if (user.role === 'admin') {
                    try {
                        const isVerified = await verifyAdmin();
                        setIsAdmin(isVerified);
                        if (!isVerified) {
                            // If admin verification fails, redirect
                            smartNavigate(navigate, location.pathname);
                        }
                    } catch (err) {
                        console.error('Admin verification error:', err);
                        // Use smart navigation on error
                        smartNavigate(navigate, location.pathname);
                    }
                }

                if (user.role === 'manager' || user.role === 'admin') {
                    try {
                        const isVerified = await verifyManager();
                        setIsManager(isVerified);
                        if (!isVerified && user.role === 'manager') {
                            // If manager verification fails, redirect
                            smartNavigate(navigate, location.pathname);
                        }
                    } catch (err) {
                        console.error('Manager verification error:', err);
                        // Use smart navigation on error
                        smartNavigate(navigate, location.pathname);
                    }
                }
            } catch (err) {
                console.error('Auth check error:', err);
                setError('Authorization check failed');
                // Use smart navigation on error
                smartNavigate(navigate, location.pathname);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthorization();
    }, [navigate, location.pathname]);

    return { isAdmin, isManager, isLoading, error };
};