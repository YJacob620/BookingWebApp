import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, Loader } from 'lucide-react';

import { verifyEmailWithToken } from '@/_utils';
import { ADMIN_DASHBOARD, LOGIN, USER_DASHBOARD } from '@/RoutePaths';
import BasePageLayout from '@/components/_BasePageLayout';


const EmailVerificationPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isVerified, setIsVerified] = useState<boolean>(false);
  // const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        // setErrorMessage('Invalid verification link');
        setIsLoading(false);
        return;
      }

      try {
        const result = await verifyEmailWithToken(token);

        if (result.success) {
          setIsVerified(true);

          // Store login information if provided
          if (result.data.token && result.data.user) {
            localStorage.setItem('token', result.data.token);
            localStorage.setItem('user', JSON.stringify(result.data.user));

            // Redirect after a delay
            setTimeout(() => {
              if (result.data.user.role === 'admin') {
                navigate(ADMIN_DASHBOARD);
              } else {
                navigate(USER_DASHBOARD);
              }
            }, 3000);
          }
        }
        // else {
        //   setErrorMessage(result.data.message || 'Email verification failed');
        // }
      } catch (error) {
        console.error('Verification error:', error);
        // setErrorMessage('An unexpected error occurred. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    verifyEmail();
  }, [token, navigate]);

  return (
    <BasePageLayout
      pageTitle="Email Verification"
    >
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
            {/* <Alert className="alert-error mb-6">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert> */}
            <p>The verification link may be invalid or expired.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        {!isLoading && !isVerified && (
          <div className="flex flex-col gap-4 items-center">
            <Link to="/resend-verification">
              <Button>
                Request New Verification Email
              </Button>
            </Link>
            <Link to={LOGIN}>
              <Button variant="custom5" className='p-1'>
                Return to Login
              </Button>
            </Link>
          </div>
        )}
        {!isLoading && isVerified && (
          <Link to={LOGIN}>
            <Button>
              Go to Login
            </Button>
          </Link>
        )}
      </CardFooter>
    </BasePageLayout>
  );
};

export default EmailVerificationPage;