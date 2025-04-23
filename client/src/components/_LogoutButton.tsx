import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { logout } from '@/utils/localAuthUtils';
import { useTranslation } from 'react-i18next';

type LogoutButtonProps = {
    className?: string;
};

const LogoutButton: React.FC<LogoutButtonProps> = () => {
    const navigate = useNavigate();

    const handleLogout = () => {
        logout(navigate);
    };

    const {t} = useTranslation()

    return (
        <Button
            onClick={handleLogout}
            className={"bg-zinc-950 h-8 discard min-w-40"}
        >
            <LogOut className="h-4 w-4 mr-2" />
            {t('Logout',{defaultValue:'Logout'})}
            {/* Logout */}
        </Button>
    );
};

export default LogoutButton;