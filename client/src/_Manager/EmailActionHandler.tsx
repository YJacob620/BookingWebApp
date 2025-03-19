import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { processEmailAction } from '@/_utils/apiFunctions';
import BasePageLayout from '@/components/_BasePageLayout';

/**
 * This component handles email action links (approve/reject)
 * It extracts the action and token from the URL and makes the appropriate API call
 */
const EmailActionHandler: React.FC = () => {
    const { action, token } = useParams<{ action: string; token: string }>();
    const navigate = useNavigate();
    const [isProcessing, setIsProcessing] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        console.warn("TEST");
        const handleAction = async () => {
            if (!action || !token) {
                setError('Missing required parameters');
                setIsProcessing(false);
                return;
            }

            if (action !== 'approve' && action !== 'reject') {
                setError('Invalid action type');
                setIsProcessing(false);
                return;
            }

            try {
                // Call the API to process the action
                await processEmailAction(action, token);

                // Redirect to the confirmation page
                navigate(`/email-action-confirmation?action=${action}&status=success`);
            } catch (err) {
                console.error('Error processing email action:', err);
                setError('Failed to process the action. The token may be invalid or expired.');
                setIsProcessing(false);
            }
        };

        handleAction();
    }, [action, token, navigate]);

    if (isProcessing) {
        return (
            <BasePageLayout pageTitle="Processing Action">
                <div className="flex flex-col items-center justify-center py-12">
                    <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                    <p className="text-lg">Processing your {action} action...</p>
                    <p className="text-sm text-gray-400 mt-2">Please wait, this will only take a moment.</p>
                </div>
            </BasePageLayout>
        );
    }

    if (error) {
        return (
            <BasePageLayout
                pageTitle="Action Failed"
                alertMessage={{ type: 'error', text: error }}
            >
                <div className="text-center py-6">
                    <p>There was a problem processing your request.</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        Go to Login
                    </button>
                </div>
            </BasePageLayout>
        );
    }

    return null;
};

export default EmailActionHandler;