import { useState, useEffect } from 'react';
import { verifyAdmin, verifyManager, fetchCurrentUser } from '@/_utils';

export const useRoleAuth = () => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [isManager, setIsManager] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                // Get user from localStorage
                const user = fetchCurrentUser();
                if (!user) {
                    setError('User not found');
                    setIsLoading(false);
                    return;
                }

                // Check permissions based on role
                if (user.role === 'admin') {
                    try {
                        const isVerified = await verifyAdmin();
                        setIsAdmin(isVerified);
                    } catch (err) {
                        console.error('Admin verification error:', err);
                    }
                }

                if (user.role === 'manager' || user.role === 'admin') {
                    try {
                        const isVerified = await verifyManager();
                        setIsManager(isVerified);
                    } catch (err) {
                        console.error('Manager verification error:', err);
                    }
                }
            } catch (err) {
                console.error('Auth check error:', err);
                setError('Authorization check failed');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthorization();
    }, []);

    return { isAdmin, isManager, isLoading, error };
};