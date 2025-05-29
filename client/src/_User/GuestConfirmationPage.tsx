import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { processGuestConfirmation } from '@/utils';
import { LOGIN, REGISTER } from '@/RoutePaths';
import BasePageLayout from '@/components/_BasePageLayout';
import { useTranslation } from 'react-i18next';


/**
 * Component to handle guest booking confirmation from email link
 */
const GuestConfirmationPage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [isLoading, setIsLoading] = useState(true);
    // const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Use a ref to track if the confirmation has been processed
    const hasProcessed = useRef(false);
    const {t,i18n} = useTranslation();


    useEffect(() => {
        if (!token) {
            setError('Invalid confirmation link');
            setIsLoading(false);
            return;
        }

        const confirmBooking = async () => {
            // Prevent duplicate processing in StrictMode
            if (hasProcessed.current) return;

            try {
                hasProcessed.current = true;
                await processGuestConfirmation(token);
                // setIsSuccess(true);
            } catch (err) {
                console.error('Error confirming booking:', err);
                setError(err instanceof Error ? err.message : t('guestConfPage.msgErrBooking','An error occurred confirming your booking'));
            } finally {
                setIsLoading(false);
            }
        };

        confirmBooking();
    }, [token]);

    if (isLoading) {
        return (
            <BasePageLayout pageTitle={t('guestConfPage.Confirming Booking')}>
                <Card className="max-w-md mx-auto">
                    <CardContent className="flex flex-col items-center py-8">
                        <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
                        <p className="text-lg">{t('guestConfPage.ProccessingBookConf','Processing your booking confirmation...')}</p>
                        <p className="text-sm text-gray-400 mt-2">{t('guestConfPage.waitWhileProc','Please wait while we confirm your booking.')}</p>
                    </CardContent>
                </Card>
            </BasePageLayout>
        );
    }

    if (error) {
        return (
            <BasePageLayout pageTitle={t('guestConfPage.Confirmation Failed')}>
                <Card className="max-w-md mx-auto">
                    <CardContent className="flex flex-col items-center py-8">
                        <XCircle className="h-16 w-16 text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold mb-4">{t('guestConfPage.Booking Confirmation Failed')}</h2>
                        <p className="text-center mb-4">{error}</p>
                    </CardContent>
                    <CardFooter className="flex justify-center">
                        <Link to={LOGIN}>
                            <Button>{t('Return to Login')}</Button>
                        </Link>
                    </CardFooter>
                </Card>
            </BasePageLayout>
        );
    }

    return (
        <BasePageLayout pageTitle={t('guestConfPage.Booking Confirmed')}>
            <Card className="max-w-md mx-auto" dir={i18n.dir()}>
                <CardContent className="flex flex-col items-center py-8">
                    <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
                    <h2 className="text-2xl font-bold mb-4">{t('guestConfPage.Booking Confirmed!')}</h2>
                    <p className="text-center mb-4">
                       {t('guestConfPage.Booking Confirmed explain','Your booking request has been submitted successfully.')} 
                    </p>
                    <p className="text-sm text-gray-400 text-center">
                        {t('guestConfPage.managerReviewExplain')}
                        {/* You will receive an email notification when the infrastructure manager reviews your request. */}
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                    <p className="text-center">
                    {t('guestConfPage.registerSuggest','Want to manage your bookings more easily?')}
                    </p>
                    <div className="flex flex-col gap-4">
                        <Link to={REGISTER}>
                            <Button className='apply w-full'>{t('Create Account')}</Button>
                        </Link>
                        <div className="text-center">
                            <p className="text-sm explanation-text1">- {t('OR')} -</p>
                        </div>
                        <Link to={LOGIN}>
                            <Button
                                variant="custom5"
                                className="w-full py-1 max-w-30 min-w-30"
                            >
                                {t('Go to Login')}
                            </Button>
                        </Link>
                    </div>
                </CardFooter>
            </Card>
        </BasePageLayout>
    );
};

export default GuestConfirmationPage;