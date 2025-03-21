import React, { useState, useEffect } from 'react';
import { Message } from '@/_utils';
import { Alert } from "@/components/ui/alert";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface FloatingAlertProps {
    message: Message;
    onClose: () => void;
    autoCloseDelay?: number; // Time in ms before auto-closing success messages
}

const FloatingAlert: React.FC<FloatingAlertProps> = ({
    message,
    onClose,
    autoCloseDelay = 5000 // Default 5 seconds
}) => {
    const [isExiting, setIsExiting] = useState(false);
    const [progressWidth, setProgressWidth] = useState(100);
    const [progressIntervalId, setProgressIntervalId] = useState<NodeJS.Timeout | null>(null);

    // Set up auto-close timer for success messages
    useEffect(() => {
        let timer: NodeJS.Timeout | null = null;

        if (message.type === 'success') {
            // Create progress bar animation
            const intervalDuration = 50; // Update every 50ms
            const steps = autoCloseDelay / intervalDuration;
            const decrementPerStep = 100 / steps;

            const interval = setInterval(() => {
                setProgressWidth(width => {
                    const newWidth = width - decrementPerStep;
                    return newWidth > 0 ? newWidth : 0;
                });
            }, intervalDuration);

            setProgressIntervalId(interval);

            // Set the timer to close the alert
            timer = setTimeout(() => {
                handleClose();
            }, autoCloseDelay);
        }

        // Cleanup timer and interval on unmount
        return () => {
            if (timer) clearTimeout(timer);
            if (progressIntervalId) clearInterval(progressIntervalId);
        };
    }, [message, autoCloseDelay]);

    const handleClose = () => {
        // Start exit animation
        setIsExiting(true);

        // Clear progress interval if it exists
        if (progressIntervalId) {
            clearInterval(progressIntervalId);
            setProgressIntervalId(null);
        }

        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            onClose();
        }, 100);
    };

    const getIcon = () => {
        switch (message.type) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-100" />;
            case 'error':
                return <AlertCircle className="h-5 w-5 text-red-100" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-100" />;
            case 'neutral':
            default:
                return <Info className="h-5 w-5 text-blue-100" />;
        }
    };

    const alertClass = `${isExiting ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'} 
        ${message.type === 'success' ? 'alert-success' :
            message.type === 'error' ? 'alert-error' :
                message.type === 'warning' ? 'alert-warning' : 'alert-neutral'
        }`;
    return (
        <Alert
            className={"fixed top-4 left-1/2 transform -translate-x-1/2 max-w-md w-full shadow-lg "
                + "rounded-md overflow-hidden transition-all duration-100 ease-in-out " + alertClass}
        >
            <div className=''>{getIcon()}</div>
            <p className="text-center py-1">{message.text}</p>
            <button
                onClick={handleClose}
                className="absolute top-2 right-2 cursor-pointer p-1 rounded-full hover:bg-black/10 transition-colors"
                aria-label="Close"
            >
                <X className="h-4 w-4" />
            </button>

            {/* Progress bar (if applicable) */}
            {message.type === 'success' && (
                <div className="h-1 bg-white/20 w-full absolute bottom-0 left-0">
                    <div
                        className="h-full bg-white/40 transition-all ease-linear"
                        style={{ width: `${progressWidth}%` }}
                    />
                </div>
            )}
        </Alert>
    );



};

interface AlertManagerProps {
    alertMessage: Message | null;
    onClearAlert: () => void;
}

const AlertManager: React.FC<AlertManagerProps> = ({
    alertMessage,
    onClearAlert
}) => {
    // Use a unique ID for each alert to track them properly
    interface AlertWithId extends Message {
        id: string;
    }

    const [activeAlerts, setActiveAlerts] = useState<AlertWithId[]>([]);

    // Reset alert timer when a new alert comes in
    useEffect(() => {
        if (alertMessage) {
            // Generate a unique ID for this alert
            const newAlertWithId: AlertWithId = {
                ...alertMessage,
                id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
            };

            // Add the new alert to our stack
            setActiveAlerts(prev => [...prev, newAlertWithId]);

            // Clear the parent's alert message so we can receive new ones
            onClearAlert();
        }
    }, [alertMessage, onClearAlert]);

    // Remove an alert from the stack
    const removeAlert = (id: string) => {
        setActiveAlerts(prev => prev.filter(alert => alert.id !== id));
    };

    if (activeAlerts.length === 0) {
        return null;
    }

    return (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="">
                {activeAlerts.map((alert, index) => (
                    <div
                        key={alert.id}
                        className="pointer-events-auto mb-2 mt-2"
                        style={{
                            marginTop: index === 0 ? '1rem' : '0.5rem',
                        }}
                    >
                        <FloatingAlert
                            message={alert}
                            onClose={() => removeAlert(alert.id)}
                            autoCloseDelay={alert.type === 'success' ? 5000 : undefined}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AlertManager;