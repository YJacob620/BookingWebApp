// src/components/EmailPreferencesToggle.tsx
import React, { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fetchEmailPreferences, updateEmailPreferences } from "@/utils";
import { useTranslation } from "react-i18next";
// import i18next from 'i18next';

interface EmailPreferencesToggleProps {
  className?: string;
}

const EmailPreferencesToggle: React.FC<EmailPreferencesToggleProps> = ({
  className,
}) => {
  const [enabled, setEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { t, i18n } = useTranslation();

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const data = await fetchEmailPreferences();

      if (data.success && data.email_notifications) {
        setEnabled(data.email_notifications);
      } else {
        throw new Error(data.message || "Failed to load preferences");
      }
    } catch (error) {
      console.error("Error loading email preferences:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to load email preferences",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggle = async (checked: boolean) => {
    try {
      setIsLoading(true);
      const result = await updateEmailPreferences(checked);

      if (result.success) {
        setEnabled(checked);
        // setMessage({
        //   type: "success",
        //   text: checked
        //     ? t(
        //         "emailSubTogCheck",
        //         "You have been subscribed to email notifications"
        //       )
        //     : t(
        //         "emailSubTogUnCheck",
        //         "You have been subscribed to email notifications"
        //       ),
        // });
      } else {
        throw new Error(result.message || "Failed to update preferences");
      }
      // 'You have been subscribed to email notifications'
      // 'You have been subscribed to email notifications'

      // Clear success message after 3 seconds
      setTimeout(() => {
        setMessage(null);
      }, 3000);
    } catch (error) {
      console.error("Error updating email preferences:", error);
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Failed to update email preferences",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-col sm:items-center sm:justify-between">
          <div className="mb-4 sm:mb-0">
            <h3 className="text-lg font-medium mb-1">
              {t("Email Notifications", "Email Notifications")}
              {/*Email Notifications*/}
            </h3>
            <p className="text-sm text-gray-400 text-center">
              {
                enabled
                  ? t(
                    "msgReciveEmailNotif.enabled",
                    "You will receive email notifications about bookings and updates"
                  )
                  : t(
                    "msgReciveEmailNotif.disabled",
                    "You will not receive any email notifications from the system"
                  )
                // ? 'You will receive email notifications about bookings and updates'
                // : 'You will not receive any email notifications from the system'
              }
            </p>
          </div>
          <div className="flex justify-center space-x-2 mt-3">
            <Label htmlFor="email-notifications" className="sr-only">
              {t("Email Notifications")}
              {/* Email Notifications */}
            </Label>
            <Switch
              id="email-notifications"
              checked={enabled}
              onCheckedChange={handleToggle}
              disabled={isLoading}
            />
          </div>
        </div>

        {message && (
          <Alert
            className={`mt-4 ${message.type === "success" ? "alert-success" : "alert-error"
              }`}
            dir={i18n.dir()}
          >
            <AlertDescription className="flex-initial self-center text-center">{message.text}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

export default EmailPreferencesToggle;
