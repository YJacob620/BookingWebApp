import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Loader } from 'lucide-react';
import { processEmailAction } from '@/_utils/apiFunctions';
import { getDashboardPath, getLocalUser } from '@/_utils/localAuthUtils';
import { LOGIN } from '@/RoutePaths';
import BasePageLayout from '@/components/_BasePageLayout';
import { Message } from '@/_utils';

/**
 * Single component that handles both the processing and display of email action results
 * It extracts the action and token from the URL, calls the API, and displays the result
 */
const EmailActionHandler: React.FC = () => {
    const { action, token } = useParams<{ action: 'approve' | 'reject'; token: string }>();
    const navigate = useNavigate();

    // States
    const [isProcessing, setIsProcessing] = useState(true);
    const [status, setStatus] = useState<'success' | 'error' | 'already-processed' | null>(null);
    const [currentStatus, setCurrentStatus] = useState<string>('');

    // Check if user is logged in
    const isLoggedIn = getLocalUser() != null;

    useEffect(() => {
        const handleAction = async () => {
            if (!action || !token) {
                setStatus('error');
                setIsProcessing(false);
                return;
            }
            try {
                // Call the API to process the action
                const result = await processEmailAction(action, token);
                console.warn("result: ", result);

                // Set session storage flag to trigger data refresh in BookingManagement
                sessionStorage.setItem('refreshBookingData', 'true');

                setStatus('success');
            } catch (err: any) {
                console.error('Error processing email action:', err);

                // Check if error is "already processed"
                if (err.message && err.message.includes('already')) {
                    setStatus('already-processed');
                    // Try to extract current status from error message
                    const statusMatch = err.message.match(/current status is: (\w+)/i);
                    if (statusMatch && statusMatch[1]) {
                        setCurrentStatus(statusMatch[1]);
                    }
                } else {
                    setStatus('error');
                }
            } finally {
                setIsProcessing(false);
            }
        };

        handleAction();
    }, [action, token, navigate]);

    const handleNavigation = () => {
        if (isLoggedIn) {
            try {
                const user = getLocalUser();
                // Navigate to appropriate dashboard based on role
                navigate(getDashboardPath(user.role));
            } catch (error) {
                // Fallback if there's an error getting user
                navigate(LOGIN);
            }
        } else {
            // Not logged in, go to login page
            navigate(LOGIN);
        }
    };

    // Determine page title
    const getTitle = () => {
        if (isProcessing) return 'Processing Action';

        if (status === 'success') {
            return action === 'approve' ? 'Booking Approved' : 'Booking Rejected';
        } else if (status === 'already-processed') {
            return 'Booking Already Processed';
        } else {
            return 'Action Failed';
        }
    };

    // Determine message to display
    const getMessage = () => {
        if (status === 'success') {
            return action === 'approve'
                ? 'The booking has been successfully approved. The user has been notified.'
                : 'The booking has been rejected. The user has been notified.';
        } else if (status === 'already-processed') {
            return `This booking has already been processed. Its current status is: ${currentStatus}.`;
        } else {
            return 'There was an error processing your request. The link may be invalid or expired.';
        }
    };

    // Display appropriate icon
    const getIcon = () => {
        if (status === 'success') {
            return action === 'approve'
                ? <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                : <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />;
        } else if (status === 'already-processed') {
            return <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />;
        } else {
            return <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />;
        }
    };

    // Determine alert message for BasePageLayout
    const getAlertMessage = (): Message | null => {
        if (!status || isProcessing) return null;

        if (status === 'success') {
            return {
                type: 'success',
                text: action === 'approve' ? 'Booking approved successfully!' : 'Booking rejected successfully!'
            };
        } else if (status === 'already-processed') {
            return {
                type: 'warning',
                text: `This booking has already been ${currentStatus}.`
            };
        } else if (status === 'error') {
            return {
                type: 'error',
                text: 'An error occurred while processing your request.'
            };
        }
        return null;
    };

    if (isProcessing) {
        return (
            <BasePageLayout pageTitle="Processing Action">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                    <p className="text-lg">Processing your {action} action...</p>
                    <p className="text-sm text-gray-400 mt-2">Please wait.</p>
                </div>
            </BasePageLayout>
        );
    }

    return (
        <BasePageLayout
            pageTitle={getTitle()}
            alertMessage={getAlertMessage()}
        >
            <div className="max-w-md mx-auto text-center">
                {getIcon()}
                <p className="mb-6">{getMessage()}</p>

                <div className="flex justify-center mt-8">
                    <Button
                        onClick={handleNavigation}
                        className={status === 'success' && action === 'approve'
                            ? 'bg-green-600 hover:bg-green-700'
                            : 'bg-blue-600 hover:bg-blue-700'}
                        size="lg"
                    >
                        {isLoggedIn ? 'Go to Dashboard' : 'Go to Login'}
                    </Button>
                </div>
            </div>
        </BasePageLayout>
    );
};

export default EmailActionHandler;