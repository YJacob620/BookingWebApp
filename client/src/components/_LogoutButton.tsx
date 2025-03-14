import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { LOGIN } from '@/RoutePaths';

type LogoutButtonProps = {
    className?: string;
};

const LogoutButton: React.FC<LogoutButtonProps> = ({
    className = "bg-zinc-950 h-8 discard"
}) => {
    const navigate = useNavigate();

    const handleLogout = () => {
        localStorage.clear();
        navigate(LOGIN);
    };

    return (
        <Button
            onClick={handleLogout}
            className={className}
        >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
        </Button>
    );
};

export default LogoutButton;