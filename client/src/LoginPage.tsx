import React, { useState, ChangeEvent, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Interface for form data
interface FormData {
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
}

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<FormData>({
        email: '',
        password: ''
    });
    const [error, setError] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
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
                <h1 className="">
                    Login
                </h1>
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

                            <div className="">
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
                                <label htmlFor="password" className="">
                                    Password
                                </label>
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
                                className="w-full"
                            >
                                {isLoading ? 'Logging in...' : 'Log in'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </Card>
    );
};

export default LoginPage;