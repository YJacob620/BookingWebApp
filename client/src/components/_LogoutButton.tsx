import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogOut, ArrowLeftCircle } from "lucide-react";
import { logout } from '@/utils/localAuthUtils';
import { useTranslation } from 'react-i18next';

type LogoutButtonProps = {
    className?: string;
    isGuest?: boolean;
};

const LogoutButton: React.FC<LogoutButtonProps> = ({
    className = "",
    isGuest = false
}
) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(navigate);
    };

    const { t } = useTranslation()

    return (
        <Button
            onClick={handleLogout}
            className={`bg-zinc-950 h-8 discard min-w-40 ${className}`}
        >
            {isGuest ? (<ArrowLeftCircle className="h-4 w-4 mr-2" />) : (<LogOut className="h-4 w-4 mr-2" />)}
            {isGuest ? t('Back to Login', { defaultValue: 'Back to Login' }) : t('Logout', { defaultValue: 'Logout' })}
        </Button>
    );
};

export default LogoutButton;