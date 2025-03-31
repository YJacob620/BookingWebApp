import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { unsubscribeEmailAction } from '@/utils/apiFunctions';
import { LOGIN } from '@/RoutePaths';
import BasePageLayout from '@/components/_BasePageLayout';
import { getDashboardPath, getLocalUser, Message } from '@/utils';

const EmailUnsubscribePage: React.FC = () => {
    const { email } = useParams<{ email: string }>();
    const navigate = useNavigate();

    // States
    const [isProcessing, setIsProcessing] = useState(true);
    const [status, setStatus] = useState<'success' | 'error' | null>(null);
    const [message, setMessage] = useState<Message | null>(null);

    // Use a ref to track if the action has been processed
    const hasProcessed = useRef(false);
    // Check if user is logged in
    const user = getLocalUser();

    useEffect(() => {
        const handleUnsubscribe = async () => {
            // Prevent duplicate processing in StrictMode
            if (hasProcessed.current) return;
            if (!email) {
                setStatus('error');
                setMessage({
                    type: 'error',
                    text: 'Invalid email address'
                });
                setIsProcessing(false);
                return;
            }

            try {
                hasProcessed.current = true;
                // Call the API to process the unsubscribe action
                await unsubscribeEmailAction(email);
                setStatus('success');
                setMessage({
                    type: 'success',
                    text: 'You have been successfully unsubscribed from email notifications.'
                });
            } catch (err: any) {
                console.error('Error processing unsubscribe action:', err);
                setStatus('error');
                setMessage({
                    type: 'error',
                    text: 'An error occurred while processing your unsubscribe request.'
                });
            } finally {
                setIsProcessing(false);
            }
        };

        handleUnsubscribe();
    }, [email]);

    const handleNavigation = () => {
        if (user) {
            try {
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

    if (isProcessing) {
        return (
            <BasePageLayout pageTitle="Unsubscribing from Emails">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                    <p className="text-lg">Processing your unsubscribe request...</p>
                    <p className="text-sm text-gray-400 mt-2">Please wait.</p>
                </div>
            </BasePageLayout>
        );
    }

    return (
        <BasePageLayout
            pageTitle={status === 'success' ? 'Successfully Unsubscribed' : 'Unsubscribe Failed'}
            alertMessage={message}
        >
            <div className="max-w-md mx-auto text-center">
                {status === 'success' ? (
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                ) : (
                    <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                )}

                {status === 'success' ? (
                    <p className="mb-6">
                        You have been successfully unsubscribed from all email notifications from the Scientific Infrastructure Booking System.
                        <br /><br />
                        If you change your mind, you can re-enable email notifications at any time by logging into your account and updating your preferences.
                    </p>
                ) : (
                    <p className="mb-6">
                        There was an error processing your unsubscribe request. The link may be invalid or expired.
                        <br /><br />
                        Please try again or log in to your account to manage your email preferences.
                    </p>
                )}

                <div className="flex justify-center mt-8">
                    <Button
                        onClick={handleNavigation}
                        size="lg"
                    >
                        {user ? 'Go to Dashboard' : 'Go to Login'}
                    </Button>
                </div>
            </div>
        </BasePageLayout>
    );
};

export default EmailUnsubscribePage;