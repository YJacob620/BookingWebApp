import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Loader } from 'lucide-react';

import { resendVerification } from '@/_utils';
import { LOGIN } from '@/RoutePaths';


interface LocationState {
  email?: string;
  message?: string;
}

const VerificationPendingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState || {};

  const [isResending, setIsResending] = useState<boolean>(false);
  const [resendSuccess, setResendSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const email = state.email || '';
  const message = state.message || 'Please check your email to verify your account.';

  // Redirect to login if there's no email (user might have navigated here directly)
  if (!email && !resendSuccess && !errorMessage) {
    // Small delay to allow component to render before redirect
    setTimeout(() => navigate(LOGIN), 100);
  }

  const handleResendVerification = async () => {
    if (!email) {
      setErrorMessage('Email address is missing');
      return;
    }

    setIsResending(true);
    setResendSuccess(false);
    setErrorMessage('');

    try {
      // Use the imported resendVerification utility
      const result = await resendVerification(email);

      if (result.success) {
        setResendSuccess(true);
      } else {
        setErrorMessage(result.data.message || 'Failed to resend verification email');
      }
    } catch (error) {
      console.error('Resend verification error:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <Card className="general-container">
      <CardHeader>
        <CardTitle className="text-3xl">Verify Your Email</CardTitle>
        <CardDescription className="explanation-text1 pt-3">
          We've sent a verification link to your email
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        <div className="text-center p-8">
          <Mail className="h-16 w-16 text-blue-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4">Check Your Inbox</h2>

          <p className="mb-6">
            We've sent a verification email to:<br />
            <span className="font-medium text-blue-400">{email || 'your email address'}</span>
          </p>

          <div className="space-y-4">
            <p>Click the link in the email to verify your account.</p>
            <p className="text-sm explanation-text1">If you don't see the email, check your spam folder.</p>
          </div>

          {errorMessage && (
            <Alert className="alert-error mt-6">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          {resendSuccess && (
            <Alert className="alert-success mt-6">
              <AlertDescription>Verification email has been resent successfully!</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        <Button
          onClick={handleResendVerification}
          disabled={isResending}
          variant="outline"
          className="w-full md:w-auto"
        >
          {isResending ? (
            <>
              <Loader className="mr-2 h-4 w-4 animate-spin" />
              Resending...
            </>
          ) : (
            'Resend Verification Email'
          )}
        </Button>

        <div className="flex justify-center w-full">
          <Link to="/login">
            <Button variant="ghost">
              Return to Login
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};

export default VerificationPendingPage;