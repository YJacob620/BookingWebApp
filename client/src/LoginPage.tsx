import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, Loader } from 'lucide-react';

// Interface for form data
interface LoginFormData {
    email: string;
    password: string;
}

// Interfaces for API response
interface LoginSuccess {
    user: {
        role: string;
        id: number;
        email: string;
        name: string;
    };
    token: string;
}

interface LoginError {
    message: string;
    needsVerification?: boolean;
    email?: string;
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<LoginFormData>({
        email: '',
        password: ''
    });
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [needsVerification, setNeedsVerification] = useState<boolean>(false);
    const [isResendingVerification, setIsResendingVerification] = useState<boolean>(false);
    const [resendSuccess, setResendSuccess] = useState<boolean>(false);

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
            const response = await fetch('http://localhost:3001/api/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();

            if (response.ok) {
                setResendSuccess(true);
            } else {
                setError(data.message || 'Failed to resend verification email');
            }
        } catch (err) {
            console.error('Resend verification error:', err);
            setError('An error occurred. Please try again later.');
        } finally {
            setIsResendingVerification(false);
        }
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        setNeedsVerification(false);
        setResendSuccess(false);
        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                const successData = data as LoginSuccess;
                localStorage.setItem('user', JSON.stringify(successData.user));
                localStorage.setItem('token', successData.token);

                if (successData.user.role === 'admin') {
                    navigate('/admin-dashboard');
                } else {
                    navigate('/user-dashboard');
                }
            } else {
                const errorData = data as LoginError;
                setError(errorData.message);

                // Check if the account needs verification
                if (errorData.needsVerification) {
                    setNeedsVerification(true);
                }
            }
        } catch (err) {
            console.error('Login error:', err);
            setError('An error occurred. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Card className="general-container">
            <CardHeader className="space-y-1">
                <CardTitle className="text-3xl">Login</CardTitle>
                <CardDescription className="explanation-text1 pt-3">
                    Sign in to access the scheduling system
                </CardDescription>
            </CardHeader>
            <div className="min-w-100">
                <Card className="card1 pt-4">
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <Alert className="alert-error">
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

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

                            <div className="space-y-2">
                                <label htmlFor="email" className="">
                                    Email
                                </label>
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

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="password" className="">
                                        Password
                                    </label>
                                    <Link to="/forgot-password" className="text-xs text-blue-400 hover:underline">
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
                                    'Log in'
                                )}
                            </Button>
                        </form>
                    </CardContent>
                    <CardFooter className="flex flex-col">
                        <div className="text-center mt-4">
                            <p className="text-gray-400">
                                Don't have an account?{" "}
                                <Link to="/register" className="text-blue-400 hover:underline">
                                    Register here
                                </Link>
                            </p>
                        </div>
                    </CardFooter>
                </Card>
            </div>
        </Card>
    );
};

export default LoginPage;