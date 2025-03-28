import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { API_BASE_URL } from '@/_utils';
import { LOGIN, REGISTER } from '@/RoutePaths';
import BasePageLayout from '@/components/_BasePageLayout';

/**
 * Component to handle guest booking confirmation from email link
 */
const GuestConfirmationPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [isLoading, setIsLoading] = useState(true);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setError('Invalid confirmation link');
            setIsLoading(false);
            return;
        }

        const confirmBooking = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/guest/confirm-booking/${token}`);

                // The backend returns HTML for a better user experience
                // If it's JSON, it's probably an error
                if (response.headers.get('content-type')?.includes('application/json')) {
                    const data = await response.json();
                    throw new Error(data.message || 'Failed to confirm booking');
                }

                setIsSuccess(true);
            } catch (err) {
                console.error('Error confirming booking:', err);
                setError(err instanceof Error ? err.message : 'An error occurred confirming your booking');
            } finally {
                setIsLoading(false);
            }
        };

        confirmBooking();
    }, [token]);

    if (isLoading) {
        return (
            <BasePageLayout pageTitle="Confirming Booking">
                <Card className="max-w-md mx-auto">
                    <CardContent className="flex flex-col items-center py-8">
                        <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                        <p className="text-lg">Processing your booking confirmation...</p>
                        <p className="text-sm text-gray-400 mt-2">Please wait while we confirm your booking.</p>
                    </CardContent>
                </Card>
            </BasePageLayout>
        );
    }

    if (error) {
        return (
            <BasePageLayout pageTitle="Confirmation Failed">
                <Card className="max-w-md mx-auto">
                    <CardContent className="flex flex-col items-center py-8">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-4">Booking Confirmation Failed</h2>
                        <p className="text-center mb-4">{error}</p>
                        <p className="text-sm text-gray-400 text-center">
                            The confirmation link may be invalid or expired.
                        </p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Link to={LOGIN}>
                            <Button>Return to Login</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </BasePageLayout>
        );
    }

    // Success case will actually be handled by the HTML response from the backend
    // This is just a fallback
    return (
        <BasePageLayout pageTitle="Booking Confirmed">
            <Card className="max-w-md mx-auto">
                <CardContent className="flex flex-col items-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-4">Booking Confirmed!</h2>
                    <p className="text-center mb-4">
                        Your booking request has been submitted successfully.
                    </p>
                    <p className="text-sm text-gray-400 text-center">
                        You will receive an email notification when the infrastructure manager reviews your request.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <p className="text-center">
                        Want to manage your bookings more easily?
                    </p>
                    <div className="flex gap-4">
                        <Link to={LOGIN}>
                            <Button variant="outline">Go to Login</Button>
                        </Link>
                        <Link to={REGISTER}>
                            <Button>Create Account</Button>
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </BasePageLayout>
    );
};

export default GuestConfirmationPage;