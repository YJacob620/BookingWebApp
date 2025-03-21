import React, { useState, useEffect, useRef } from 'react';
import { Message } from '@/_utils';
import { Alert } from "@/components/ui/alert";
import { X, CheckCircle, AlertTriangle, AlertCircle, Info } from 'lucide-react';

interface AlertManagerProps {
    alertMessage: Message | null;
    onClearAlert: () => void;
}

const AlertManager: React.FC<AlertManagerProps> = ({
    alertMessage,
    onClearAlert
}) => {
    const [currentAlert, setCurrentAlert] = useState<Message | null>(null);
    const [isExiting, setIsExiting] = useState(false);
    const [progressWidth, setProgressWidth] = useState(100);
    const progressIntervalId = useRef<NodeJS.Timeout | null>(null);
    const timeoutId = useRef<NodeJS.Timeout | null>(null);

    const AUTO_CLOSE_DELAY = 5000; // 5 seconds for auto-closing

    // When a new alert arrives, update current alert
    useEffect(() => {
        if (alertMessage) {
            // Clear any existing timers and animations
            clearTimers();

            // Reset animation state
            setIsExiting(false);
            setProgressWidth(100);

            // Set the new alert
            setCurrentAlert(alertMessage);

            // Clear the parent's alert message so we can receive new ones
            onClearAlert();

            // Set up auto-close for success messages
            if (alertMessage.type === 'success') {
                setupAutoClose();
            }
        }
    }, [alertMessage, onClearAlert]);

    const clearTimers = () => {
        if (progressIntervalId.current) {
            clearInterval(progressIntervalId.current);
            progressIntervalId.current = null;
        }
        if (timeoutId.current) {
            clearTimeout(timeoutId.current);
            timeoutId.current = null;
        }
    };

    const setupAutoClose = () => {
        // Create progress bar animation
        const intervalDuration = 50; // Update every 50ms
        const steps = AUTO_CLOSE_DELAY / intervalDuration;
        const decrementPerStep = 100 / steps;

        progressIntervalId.current = setInterval(() => {
            setProgressWidth(width => {
                const newWidth = width - decrementPerStep;
                return newWidth > 0 ? newWidth : 0;
            });
        }, intervalDuration);

        // Set the timer to close the alert
        timeoutId.current = setTimeout(() => {
            handleClose();
        }, AUTO_CLOSE_DELAY);
    };

    const handleClose = () => {
        // Start exit animation
        setIsExiting(true);
        clearTimers();

        // Wait for animation to complete before removing from DOM
        setTimeout(() => {
            setCurrentAlert(null);
        }, 100);
    };

    const getIcon = () => {
        if (!currentAlert) return null;

        switch (currentAlert.type) {
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

    // Clean up timers when component unmounts
    useEffect(() => {
        return () => {
            clearTimers();
        };
    }, []);

    if (!currentAlert) {
        return null;
    }

    const alertClass = `${isExiting ? 'opacity-0 translate-y-[-20px]' : 'opacity-100 translate-y-0'} 
        ${currentAlert.type === 'success' ? 'alert-success' :
            currentAlert.type === 'error' ? 'alert-error' :
                currentAlert.type === 'warning' ? 'alert-warning' : 'alert-neutral'
        }`;

    return (
        <div className="fixed top-0 left-0 right-0 z-50 pointer-events-none">
            <div className="pointer-events-auto mt-4">
                <Alert
                    className={"fixed top-4 left-1/2 transform -translate-x-1/2 max-w-md w-full shadow-lg "
                        + "rounded-md overflow-hidden transition-all duration-100 ease-in-out flex items-start " + alertClass}
                >
                    <div className="flex-shrink-0 mr-2 mt-1">{getIcon()}</div>
                    <p className="flex-grow py-1 pr-6">{currentAlert.text}</p>
                    <button
                        onClick={handleClose}
                        className="absolute top-2 right-2 cursor-pointer p-1 rounded-full hover:bg-black/10 transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    {/* Progress bar for success messages */}
                    {currentAlert.type === 'success' && (
                        <div className="h-1 bg-white/20 w-full absolute bottom-0 left-0">
                            <div
                                className="h-full bg-white/40 transition-all ease-linear"
                                style={{ width: `${progressWidth}%` }}
                            />
                        </div>
                    )}
                </Alert>
            </div>
        </div>
    );
};

export default AlertManager;