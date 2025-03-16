import { useState, useEffect } from 'react';
import { verifyAdmin, verifyManager, verifyUser, getUserFromStorage, UserRole, USER_ROLES } from '@/_utils';

export const userRoleAuthentication = () => {
    // const [isAdmin, setIsAdmin] = useState(false);
    // const [isManager, setIsManager] = useState(false);
    // const [isUser, setIsUser] = useState(false);
    const [authenticatedRole, setRole] = useState<UserRole | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuthorization = async () => {
            try {
                const user = getUserFromStorage();
                if (user) {
                    let verified: boolean = false;
                    try {
                        if (user.role === 'admin') {
                            verified = await verifyAdmin();
                        } else if (user.role === 'manager') {
                            verified = await verifyManager();
                        } else if (USER_ROLES.includes(user.role)) {
                            verified = await verifyUser();
                        }
                    } catch (err) {
                        console.error('Verification error:', err);
                        setRole(null);
                    }
                    setRole(verified ? user.role : null);
                }

                // if (!user) {
                //     setError('User not found');
                //     setIsLoading(false);
                //     return;
                // }
                // setIsUser(true);
                // if (user.role === 'admin') {
                //     try {
                //         const isVerified = await verifyAdmin();
                //         setIsAdmin(isVerified);
                //         setIsManager(isVerified);
                //     } catch (err) {
                //         console.error('Admin verification error:', err);
                //     }
                // }
                // else if (user.role === 'manager') {
                //     try {
                //         const isVerified = await verifyManager();
                //         setIsManager(isVerified);
                //     } catch (err) {
                //         console.error('Manager verification error:', err);
                //     }
                // }
            } catch (err) {
                console.error('Auth check error:', err);
                setError('Authorization check failed');
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthorization();
    }, []);

    // return { isAdmin, isManager, isUser, isLoading, error };
    return { authenticatedRole, isLoading, error };
};