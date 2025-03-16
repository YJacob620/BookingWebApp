import { useState, useEffect } from 'react';
import { verifyAdmin, verifyManager, verifyUser, getUserFromStorage, UserRole, USER_ROLES } from '@/_utils';

export const userRoleAuthentication = () => {
    const [authenticatedRole, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isVerified, setIsVerified] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                const user = getUserFromStorage();
                if (user) {
                    try {
                        if (user.role === 'admin') {
                            const verified = await verifyAdmin();
                            setIsVerified(verified);
                        } else if (user.role === 'manager') {
                            const verified = await verifyManager();
                            setIsVerified(verified);
                        } else if (USER_ROLES.includes(user.role)) {
                            const verified = await verifyUser();
                            setIsVerified(verified);
                        }
                    } catch (err) {
                        console.error('Verification error:', err);
                        setRole(null);
                    }
                    setRole(isVerified ? user.role : null);
                    if (isVerified) {
                        console.warn("ASDASD");
                    }
                } else {
                    /* TODO: Figure out if the role should be set as 'guest' here or not */
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
    return { authenticatedRole, isLoading, isVerified, error };
};