import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader } from 'lucide-react';

import { resendVerification, login, User, getDashboardPath, Message } from '@/_utils';
import BasePageLayout from '../components/_BasePageLayout';
import { FORGOT_PASSWORD, REGISTER, CREATE_BOOKING } from '@/RoutePaths';

import { useTranslation } from 'react-i18next';

// Interface for form data
interface LoginFormData {
    email: string;
    password: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: ''
    });
    const [message, setMessage] = useState<Message | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [needsVerification, setNeedsVerification] = useState<boolean>(false);
    const [isResendingVerification, setIsResendingVerification] = useState<boolean>(false);
    const [resendSuccess, setResendSuccess] = useState<boolean>(false);

    const [t] = useTranslation();

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleResendVerification = async () => {
        if (!formData.email) return;

        setIsResendingVerification(true);
        setResendSuccess(false);

        try {
            // Use the imported resendVerification utility
            const result = await resendVerification(formData.email);

            if (result.success) {
                setResendSuccess(true);
            } else {
                setMessage({
                    type: 'error',
                    text: result.data.message || 'Failed to resend verification email'
                });
            }
        } catch (err) {
            console.error('Resend verification error:', err);
            setMessage({
                type: 'error',
                text: 'An error occurred. Please try again later.'
            });
        } finally {
            setIsResendingVerification(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setMessage(null);
        setNeedsVerification(false);
        setResendSuccess(false);
        setIsLoading(true);

        try {
            // Check if trying to log in as guest
            if (formData.email.toLowerCase().includes('guest@')) {
                setMessage({
                    type: 'error',
                    text: 'Guest accounts cannot be logged into. Please use our guest booking feature instead.'
                });
                setIsLoading(false);
                return;
            }

            // Use the imported login utility
            const result = await login(formData.email, formData.password);

            if (result.success) {
                const successData = result.data;
                const user: User = successData.user;

                // Use the shared getDashboardPath utility for redirection
                const dashboardPath = getDashboardPath(user.role);
                navigate(dashboardPath);
            } else {
                setMessage({
                    type: 'error',
                    text: result.data.message
                });

                // Check if the account needs verification
                if (result.data.needsVerification) {
                    setNeedsVerification(true);
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            setMessage({
                type: 'error',
                text: 'An error occurred. Please try again later.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BasePageLayout
            pageTitle="Login"
            explanationText={"Sign in to access the scheduling system"}
            alertMessage={message}
        >
            <Card className="card1 pt-1 min-w-100">
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {needsVerification && (
                            <Alert className="bg-amber-800 text-amber-100 mb-4">
                                <AlertDescription className="flex flex-col gap-2">
                                    <p>Your email address hasn't been verified yet.</p>
                                    {!resendSuccess && !isResendingVerification && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            className="w-full md:w-auto"
                                            onClick={handleResendVerification}
                                        >
                                            Resend Verification Email
                                        </Button>
                                    )}
                                    {isResendingVerification && (
                                        <div className="flex items-center gap-2 text-sm">
                                            <Loader className="h-4 w-4 animate-spin" />
                                            Sending verification email...
                                        </div>
                                    )}
                                    {resendSuccess && (
                                        <div className="text-green-300 text-sm flex items-center gap-2">
                                            <Info className="h-4 w-4" />
                                            Verification email sent! Please check your inbox.
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        <div>
                            <p className='text-left pb-0.5 pl-0.5'>
                                Email
                            </p>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center">
                                <p className='text-left pl-0.5'>
                                    Password
                                </p>
                                <Link to={FORGOT_PASSWORD} className="link text-sm">
                                    Forgot password?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Enter your password"
                            />
                        </div>

                        <div className="flex flex-col gap-4">
                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full apply"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                                        Logging in...
                                    </>
                                ) : (
                                    t('Login')
                                )}
                            </Button>

                            <div className="text-center">
                                <p className="text-sm explanation-text1">- OR -</p>
                            </div>

                            <Link to={`${CREATE_BOOKING}?guest=true`}>
                                <Button
                                    type="button"
                                    variant="custom5"
                                    className="w-full h-7"
                                >
                                    Continue as Guest
                                </Button>
                            </Link>
                        </div>
                    </form>
                </CardContent>
                <CardFooter className="flex flex-col">
                    <div className="text-center mt-4">
                        <p className="text-gray-400">
                            Don't have an account?{" "}
                            <Link to={REGISTER} className="text-blue-400 hover:underline">
                                Register here
                            </Link>
                        </p>
                    </div>
                </CardFooter>
            </Card>
        </BasePageLayout>
    );
};

export default LoginPage;