import React, { ReactNode, useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import BackToDashboardButton from '@/components/_BackToDashboardButton';
import LogoutButton from '@/components/_LogoutButton';
import { Message } from '@/_utils';
import AlertManager from './_AlertManager';

interface BasePageLayoutProps {
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

  className?: String
}

/**
 * Component that provides a consistent layout for pages.
 */
const BasePageLayout: React.FC<BasePageLayoutProps> = ({
  children,
  pageTitle,
  showDashboardButton = false,
  showLogoutButton = false,
  alertMessage,
  explanationText,
  className
}) => {
  // State to manage alerts
  const [currentAlert, setCurrentAlert] = useState<Message | null>(alertMessage || null);

  // Apply page title if provided
  if (pageTitle && typeof document !== 'undefined') {
    document.title = pageTitle;
  }

  // Update current alert when alertMessage prop changes
  useEffect(() => {
    if (alertMessage) {
      setCurrentAlert(alertMessage);
    }
  }, [alertMessage]);

  // Clear the current alert
  const clearAlert = () => {
    setCurrentAlert(null);
  };

  return (
    <>
      {/* Floating alert manager */}
      <AlertManager
        alertMessage={currentAlert}
        onClearAlert={clearAlert}
      />

      <Card className={`general-container ${className}`}>
        <div className="max-w-7xl mx-3">
          <div
            className={`grid ${showDashboardButton && showLogoutButton ? 'grid-cols-2' : 'grid-cols-1'}`}
          >
            {showDashboardButton && (
              <div className="flex justify-start mb-7">
                <BackToDashboardButton />
              </div>
            )}
            {showLogoutButton && (
              <div className="flex justify-end mb-7">
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
            <p className="explanation-text1 mt-2">
              {explanationText}
            </p>
          )}
          <br />

          {children}
        </div>
      </Card>
    </>
  );
};

export default BasePageLayout;