import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowLeftCircle } from "lucide-react";
import { smartNavigate } from '@/_utils/navigation';

const BackToDashboardButton: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigate = () => {
        // Use the smart navigation utility with current path
        smartNavigate(navigate, location.pathname);
    };

    return (
        <Button
            onClick={handleNavigate}
            className="back-button"
        >
            <ArrowLeftCircle className="mr-2 h-4 w-4" />
            Back to Dashboard
        </Button>
    );
};

export default BackToDashboardButton;