import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardHeader, CardContent, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Info, Loader } from 'lucide-react';

import { resetPassword } from '@/utils';
import { LOGIN, FORGOT_PASSWORD } from '@/RoutePaths';
import { useTranslation } from 'react-i18next';


const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { t } = useTranslation()

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Use the imported resetPassword utility
      const result = await resetPassword(token!, password);

      if (result.success) {
        setIsSuccess(true);

        // Redirect to login after a delay
        setTimeout(() => {
          navigate(LOGIN);
        }, 3000);
      } else {
        setErrorMessage(result.data.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      setErrorMessage('An unexpected error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = (): boolean => {
    // Clear previous errors
    setErrorMessage('');

    // Check if passwords match
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match');
      return false;
    }

    // Check password length
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters');
      return false;
    }

    return true;
  };

  // If no token is provided, redirect to forgot password page
  if (!token) {
    navigate(FORGOT_PASSWORD);
    return null;
  }

  return (
    <Card className="general-container">
      <CardHeader>
        <CardTitle className="text-3xl">{t('Reset Password', 'Reset Password')}</CardTitle>
        <CardDescription className="explanation-text1 pt-3">
          {t('Enter your new password', 'Enter your new password')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isSuccess ? (
          <div className="text-center p-6">
            <Alert className="alert-success mb-6">
              <AlertDescription>
                {t('psswrdResetSuccess.msg', 'Your password has been reset successfully!')}
              </AlertDescription>
            </Alert>
            <p className="mb-2">{t('psswrdResetSuccess.redir', 'You will be redirected to the login page shortly.')}</p>
            <p className="text-sm explanation-text1">
              {t('psswrdResetSuccess.redirfail', "If you're not redirected, you can manually return to the login page.")}
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
              <Label>{t('New Password', 'New Password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={handlePasswordChange}
                // placeholder={t("Enter new password","Enter new password")}
                dir='ltr'
              />
              <p className="text-xs text-gray-400">
                <Info className="inline mr-1 h-3 w-3" />
                {t('pswrdChrsNumMsg', 'Password must be at least 8 characters')}
              </p>
            </div>

            <div className="space-y-2">
              <Label>{t('Confirm Password', 'Confirm Password')}</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={handleConfirmPasswordChange}
                // placeholder={t('Confirm New Password','Confirm New Password')}
                dir='ltr'
              />
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? (
                <div dir='auto'>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  {t('Resetting', 'Resetting...')}
                </div>
              ) : (
                t('Reset Password', 'Reset Password')
              )}
            </Button>
          </form>
        )}
      </CardContent>
      <CardFooter className="flex justify-center">
        <Link to={LOGIN}>
          <Button variant="ghost">
            {t('Back to', { where: t('Login'), defaultValue: 'Back to {{where}}' })}
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export default ResetPasswordPage;