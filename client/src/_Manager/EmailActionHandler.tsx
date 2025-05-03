import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Loader } from "lucide-react";
import { getDashboardPath, getLocalUser, processEmailAction } from "@/utils";
import { LOGIN } from "@/RoutePaths";
import BasePageLayout from "@/components/_BasePageLayout";
import { useTranslation } from "react-i18next";

/**
 * Single component that handles both the processing and display of email action results.
 * It extracts the action and token from the URL, calls the API, and displays the result.
 * It's used when an infrastructure manager accepts/rejects bookings request via emails.
 */
const EmailActionHandler: React.FC = () => {
  const { action, token } = useParams<{
    action: "approve" | "reject";
    token: string;
  }>();
  const navigate = useNavigate();

  // States
  const [isProcessing, setIsProcessing] = useState(true);
  const [status, setStatus] = useState<
    "success" | "error" | "already-processed" | null
  >(null);
  const [currentStatus, setCurrentStatus] = useState<string>("");

  // Use a ref to track if the action has been processed
  const hasProcessed = useRef(false);

  // Check if user is logged in
  const user = getLocalUser();

  const { t,i18n } = useTranslation();

  useEffect(() => {
    const handleAction = async () => {
      // Prevent duplicate processing in StrictMode
      if (hasProcessed.current) return;

      if (!action || !token) {
        setStatus("error");
        setIsProcessing(false);
        return;
      }

      try {
        hasProcessed.current = true;
        // Call the API to process the action
        await processEmailAction(action, token);

        // Set session storage flag to trigger data refresh in BookingManagement
        sessionStorage.setItem("refreshBookingData", "true");

        setStatus("success");
      } catch (err: any) {
        console.error("Error processing email action:", err);

        // Check if error is "already processed"
        if (err.message && err.message.includes("already")) {
          setStatus("already-processed");
          // Try to extract current status from error message
          const statusMatch = err.message.match(/current status is: (\w+)/i);
          if (statusMatch && statusMatch[1]) {
            setCurrentStatus(statusMatch[1]);
          }
        } else {
          setStatus("error");
        }
      } finally {
        setIsProcessing(false);
      }
    };

    handleAction();
  }, [action, token, navigate]);

  const handleNavigation = () => {
    if (user) {
      try {
        // Navigate to appropriate dashboard based on role
        navigate(getDashboardPath(user.role));
      } catch (error) {
        // Fallback if there's an error getting user
        navigate(LOGIN);
      }
    } else {
      // Not logged in, go to login page
      navigate(LOGIN);
    }
  };

  // Determine page title
  const getTitle = () => {
    if (isProcessing)
      return t("emailActHandler.actProccesing", "Processing Action");

    if (status === "success") {
      return action === "approve"
        ? t("emailActHandler.bookApproved", "Booking Approved")
        : t("emailActHandler.bookRejected", "Booking Rejected");
    } else if (status === "already-processed") {
      return t("emailActHandler.bookAlrProcessed", "Booking Already Processed");
    } else {
      return t("emailActHandler.actFail", "Action Failed");
    }
  };

  // Determine message to display
  const getMessage = () => {
    if (status === "success") {
      return action === "approve"
        ? t(
            "emailActHandler.statAppMsgStart",
            "The booking has been successfully approved. The user has been notified.\n"
          ) + t("emailActHandler.statAppMsgEnd")
        : // "In Outlook, you can add it as a calendar event by " +
          //   "clicking on the attached ICS file in the email for this booking."

          t(
            "emailActHandler.rejMsg",
            "The booking has been rejected. The user has been notified."
          );
    } else if (status === "already-processed") {
      return t("emailActHandler.procMsg", { currentStatus: currentStatus });
      //   `This booking has already been processed. Its current status is: ${currentStatus}.`;
    } else {
      return t("emailActHandler.errMsg");
      //   "There was an error processing your request. The link may be invalid or expired.";
    }
  };

  // Display appropriate icon
  const getIcon = () => {
    if (status === "success") {
      return action === "approve" ? (
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
      ) : (
        <CheckCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
      );
    } else if (status === "already-processed") {
      return (
        <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
      );
    } else {
      return <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />;
    }
  };

  if (isProcessing) {
    return (
      <BasePageLayout pageTitle="Processing Action">
        <div className="flex flex-col items-center justify-center py-12">
          <Loader className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-lg">
            {action != undefined
              ? t(`emailActHandler.${action}`)
              : t("undefined")}
          </p>
          <p className="text-sm text-gray-400 mt-2">
            {t("Please wait",{ context: "dot" })}
          </p>
        </div>
      </BasePageLayout>
    );
  }

  return (
    <BasePageLayout pageTitle={getTitle()}>
      <div className="max-w-md mx-auto text-center">
        {getIcon()}
        <p className="mb-6">{getMessage()}</p>

        <div className="flex justify-center mt-8">
          <Button onClick={handleNavigation} size="lg">
            {user ? t("Go to Dashboard") : t("Go to Login")}
          </Button>
        </div>
      </div>
    </BasePageLayout>
  );
};

export default EmailActionHandler;
