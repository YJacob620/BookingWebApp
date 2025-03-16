import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader } from 'lucide-react';

import { requestPasswordReset } from '@/_utils';
import ProtectedPageLayout from '@/components/_ProtectedPageLayout';
import { LOGIN } from '@/RoutePaths';


const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      // Use the imported requestPasswordReset utility
      const result = await requestPasswordReset(email);

      if (result.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(result.data.message || 'Failed to process password reset request');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProtectedPageLayout
      pageTitle="Forgot Password"
      explanationText="Enter your email to receive a password reset link"
    >
      <Card className="pt-2">
        <CardContent>
          {isSuccess ? (
            <div className="text-centerz">
              <Alert className="alert-success mb-6">
                <AlertDescription>
                  If an account exists with that email, we've sent password reset instructions.
                  Please check your inbox.
                </AlertDescription>
              </Alert>
              <p className="text-sm explanation-text1 mb-6">
                If you don't receive an email within a few minutes, check your spam folder
                or make sure you entered the correct email address.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <Alert className="alert-error">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  placeholder="Enter your email address"
                />
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <CardFooter className="flex justify-center">
        <Link to={LOGIN} className="link mt-2 -mb-5">
          Back to Login
        </Link>
      </CardFooter>
    </ProtectedPageLayout>
  );
};

export default ForgotPasswordPage;