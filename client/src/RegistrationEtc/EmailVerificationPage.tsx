import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader } from 'lucide-react';

const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setErrorMessage('Invalid verification link');
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:3001/api/verify-email/${token}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        const data = await response.json();

        if (response.ok) {
          setIsVerified(true);

          // Store login information if provided
          if (data.token && data.user) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect after a delay
            setTimeout(() => {
              if (data.user.role === 'admin') {
                navigate('/admin-dashboard');
              } else {
                navigate('/user-dashboard');
              }
            }, 3000);
          }
        } else {
          setErrorMessage(data.message || 'Email verification failed');
        }
      } catch (error) {
        console.error('Verification error:', error);
        setErrorMessage('An unexpected error occurred. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <Card className="general-container">
      <CardHeader>
        <CardTitle className="text-3xl">Email Verification</CardTitle>
        <CardDescription className="explanation-text1 pt-3">
          Verifying your email address
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center">
        {isLoading ? (
          <div className="text-center p-8">
            <Loader className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-lg">Verifying your email address...</p>
          </div>
        ) : isVerified ? (
          <div className="text-center p-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Email Verified Successfully!</h2>
            <p className="mb-6">Your email has been verified and your account is now active.</p>
            <p className="text-sm explanation-text1">You will be redirected to the dashboard automatically...</p>
          </div>
        ) : (
          <div className="text-center p-8">
            <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Verification Failed</h2>
            <Alert className="alert-error mb-6">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
            <p>The verification link may be invalid or expired.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {!isLoading && !isVerified && (
          <div className="flex flex-col gap-4 items-center">
            <Link to="/resend-verification">
              <Button variant="outline">
                Request New Verification Email
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost">
                Return to Login
              </Button>
            </Link>
          </div>
        )}
        {!isLoading && isVerified && (
          <Link to="/login">
            <Button>
              Go to Login
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
};

export default EmailVerificationPage;