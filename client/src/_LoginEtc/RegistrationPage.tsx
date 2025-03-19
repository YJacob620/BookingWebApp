import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Info } from 'lucide-react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { Message, register, RegistrationFormData } from '@/_utils';
import { LOGIN, VERIFICATION_PENDING } from '@/RoutePaths';
import BasePageLayout from '@/components/_BasePageLayout';


interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    role?: string;
}

const RegistrationPage: React.FC = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState<RegistrationFormData>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'student'
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [message, setMessage] = useState<Message | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear specific error when user corrects input
        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({
                ...prev,
                [name]: undefined
            }));
        }
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({
            ...prev,
            role: value
        }));

        // Clear role error if present
        if (errors.role) {
            setErrors(prev => ({
                ...prev,
                role: undefined
            }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        // Name validation
        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        // Email validation
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        // Password validation
        if (!formData.password) {
            newErrors.password = 'Password is required';
        } else if (formData.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        // Confirm password
        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
        }

        // Role validation
        if (!formData.role) {
            newErrors.role = 'Please select a role';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Form validation
        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {
            // Use the imported register utility
            const result = await register(formData);

            if (result.success) {
                setMessage({
                    type: 'success',
                    text: result.data.message ||
                        'Registration successful! Please check your email to verify your account.'
                });

                // Clear form
                setFormData({
                    name: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    role: 'student'
                });

                // Redirect to verification pending page after a delay
                setTimeout(() => {
                    navigate(VERIFICATION_PENDING, {
                        state: {
                            email: formData.email,
                            message: result.data.message
                        }
                    });
                }, 3000);
            } else {
                setMessage({
                    type: 'error',
                    text: result.data.message || 'Registration failed. Please try again.'
                });
            }
        } catch (error) {
            console.error('Registration error:', error);
            setMessage({
                type: 'error',
                text: 'An unexpected error occurred. Please try again later.'
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <BasePageLayout
            pageTitle="Create an Account"
            explanationText={"Register to access the infrastructure booking system"}
            alertMessage={message}
        >
            <Card className="card1 pt-4">
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                id="name"
                                name="name"
                                type="text"
                                required
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Enter your name"
                                className={errors.name ? "border-red-500" : ""}
                            />
                            {errors.name && (
                                <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                id="email"
                                name="email"
                                type="email"
                                required
                                value={formData.email}
                                onChange={handleInputChange}
                                placeholder="Enter your email"
                                className={errors.email ? "border-red-500" : ""}
                            />
                            {errors.email && (
                                <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Password</Label>
                            <Input
                                id="password"
                                name="password"
                                type="password"
                                required
                                value={formData.password}
                                onChange={handleInputChange}
                                placeholder="Create a password"
                                className={errors.password ? "border-red-500" : ""}
                            />
                            {errors.password && (
                                <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                            )}
                            <p className="text-xs explanation-text1">
                                <Info className="inline mr-1 h-3 w-3" />
                                Password must be at least 8 characters
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Confirm Password</Label>
                            <Input
                                id="confirmPassword"
                                name="confirmPassword"
                                type="password"
                                required
                                value={formData.confirmPassword}
                                onChange={handleInputChange}
                                placeholder="Confirm your password"
                                className={errors.confirmPassword ? "border-red-500" : ""}
                            />
                            {errors.confirmPassword && (
                                <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                                value={formData.role}
                                onValueChange={handleSelectChange}
                            >
                                <SelectTrigger id="role" className={errors.role ? "border-red-500" : ""}>
                                    <SelectValue placeholder="Select your role" />
                                </SelectTrigger>
                                <SelectContent className="card1">
                                    <SelectItem value="student">Student</SelectItem>
                                    <SelectItem value="faculty">Faculty</SelectItem>
                                </SelectContent>
                            </Select>
                            {errors.role && (
                                <p className="text-red-500 text-sm mt-1">{errors.role}</p>
                            )}
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full apply"
                        >
                            {isLoading ? 'Registering...' : 'Register'}
                        </Button>

                        <div className="text-center mt-4">
                            <p className="explanation-text1">
                                Already have an account?{" "}
                                <Link to={LOGIN} className="link">
                                    Log in
                                </Link>
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </BasePageLayout>
    );
};

export default RegistrationPage;