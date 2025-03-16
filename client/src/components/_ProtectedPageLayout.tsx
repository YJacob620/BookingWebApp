import React, { ReactNode } from 'react';
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import BackToDashboardButton from '@/components/_BackToDashboardButton';
import LogoutButton from '@/components/_LogoutButton';
import { Message } from '@/_utils';

interface ProtectedPageLayoutProps {
  // Content to display
  children: ReactNode;

  // Optional page title
  pageTitle?: string;

  // Whether to show back button
  showDashboardButton?: boolean;

  // Whether to show back button
  showLogoutButton?: boolean;

  // Message for the alert - success or error
  alertMessage?: Message | null;

  explanationText?: String
}

/**
 * ProtectedPageLayout - Standard layout for protected pages
 * 
 * This component provides a consistent layout for protected pages
 * without handling authentication (which is now done at the route level).
 */
const ProtectedPageLayout: React.FC<ProtectedPageLayoutProps> = ({
  children,
  pageTitle,
  showDashboardButton = false,
  showLogoutButton = false,
  alertMessage,
  explanationText,
}) => {
  // Apply page title if provided
  if (pageTitle && typeof document !== 'undefined') {
    document.title = pageTitle;
  }

  return (
    <Card className="general-container">
      <div className="max-w-7xl mx-3">
        <div
          className={`grid ${showDashboardButton && showLogoutButton ? 'grid-cols-2' : 'grid-cols-1'}`}
        >
          {showDashboardButton && (
            <div className="flex justify-start mb-9">
              <BackToDashboardButton />
            </div>
          )}
          {showLogoutButton && (
            <div className="flex justify-end mb-9">
              <LogoutButton />
            </div>
          )}
        </div>


        {pageTitle && (
          <div className="flex justify-center items-center">
            <h1>{pageTitle}</h1>
          </div>
        )}


        {explanationText && (
          <p className="explanation-text1 mt-1">
            {explanationText}
          </p>
        )}
        <br />

        {alertMessage && (
          <Alert
            className={`-mt-2 mb-6 ${alertMessage.type === 'success'
                ? 'alert-success'
                : alertMessage.type === 'error'
                  ? 'alert-error'
                  : alertMessage.type === 'warning'
                    ? 'alert-warning'
                    : alertMessage.type === 'neutral'
                      ? 'alert-neutral'
                      : ''
              }`}
          >
            <AlertDescription>{alertMessage.text}</AlertDescription>
          </Alert>
        )}
        {children}
      </div>
    </Card>
  );
};

export default ProtectedPageLayout;