import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeftCircle } from "lucide-react";
import { ADMIN_DASHBOARD, MANAGER_DASHBOARD, USER_DASHBOARD, LOGIN } from '@/RoutePaths';

const BackToDashboardButton: React.FC = () => {
    const navigate = useNavigate();

    const handleNavigate = () => {
        // Get the current user from localStorage
        const userString = localStorage.getItem('user');

        if (!userString) {
            console.error('No user data found');
            navigate(LOGIN);
            return;
        }

        try {
            const user = JSON.parse(userString);

            // Navigate based on explicit user role
            switch (user.role) {
                case 'admin':
                    navigate(ADMIN_DASHBOARD);
                    break;
                case 'manager':
                    navigate(MANAGER_DASHBOARD);
                    break;
                case 'faculty':
                case 'student':
                case 'guest':
                    navigate(USER_DASHBOARD);
                    break;
                default:
                    // Log an error and logout for unexpected roles
                    console.error(`Unexpected user role: ${user.role}`);
                    localStorage.clear();
                    navigate(LOGIN);
                    break;
            }
        } catch (error) {
            console.error('Error parsing user data:', error);
            navigate(LOGIN);
        }
    };

    return (
        <Button
            onClick={handleNavigate}
            className="back-button min-w-40"
        >
            <ArrowLeftCircle className="mr-2 h-4 w-4" />
            Dashboard
        </Button>
    );
};

export default BackToDashboardButton;