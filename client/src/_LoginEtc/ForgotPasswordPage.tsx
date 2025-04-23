import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Loader } from 'lucide-react';

import { requestPasswordReset } from '@/utils';
import BasePageLayout from '@/components/_BasePageLayout';
import { LOGIN } from '@/RoutePaths';


import { useTranslation } from "react-i18next";


const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const {t} = useTranslation()

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
    <BasePageLayout
      pageTitle={t("forgotPassPgTitle")}
      explanationText={t('forgotPassPgexplain',"Enter your email to receive a password reset link")}
    >
      <Card className="pt-2">
        <CardContent>
          {isSuccess ? (
            <div className="text-centerz">
              <Alert className="alert-success mb-6">
                <AlertDescription>
                  {t('alert.paswrdresetsuccses')}
                  {/* If an account exists with that email, we've sent password
                  reset instructions. Please check your inbox. */}
                </AlertDescription>
              </Alert>
              <p className="text-sm explanation-text1 mb-6">
                {t('explain.ifDontRecieveEmail')}
                {/* If you don't receive an email within a few minutes, check your
                spam folder or make sure you entered the correct email address. */}
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
                <Label>{t("Email")}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={email}
                  onChange={handleEmailChange}
                  placeholder={t("inputEmailPlcHldr", {
                    defaultValue: "Enter your email",
                  })}
                  // placeholder="Enter your email address"
                />
              </div>

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    {t("sending", {defaultValue: "Sending...", })}
                    {/* Sending... */}
                  </>
                ) : (
                  t("Send Reset Link", {defaultValue: "Send Reset Link", })
                  // "Send Reset Link"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
      <CardFooter className="flex justify-center">
        <Link to={LOGIN} className="link mt-2 -mb-5">
        {t("Back to Login", {defaultValue: "Back to Login", })}
          {/* Back to Login */}
        </Link>
      </CardFooter>
    </BasePageLayout>
  );
};

export default ForgotPasswordPage;