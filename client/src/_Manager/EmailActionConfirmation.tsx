import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { LOGIN } from '@/RoutePaths';
import { getLocalUser, getDashboardPath, Message } from '@/_utils';
import BasePageLayout from '@/components/_BasePageLayout';

const EmailActionConfirmation: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const action = searchParams.get('action') || '';
  const status = searchParams.get('status') || '';
  const currentStatus = searchParams.get('current') || '';

  // Determine if user is logged in and get their role
  const user = getLocalUser();
  const isLoggedIn = !!user;

  const handleNavigation = () => {
    if (isLoggedIn && user) {
      // Navigate to the appropriate dashboard using the utility function
      navigate(getDashboardPath(user.role));
    } else {
      // Not logged in, go to login page
      navigate(LOGIN);
    }
  };

  const getTitle = () => {
    if (status === 'success') {
      return action === 'approve' ? 'Booking Approved' : 'Booking Rejected';
    } else if (status === 'already-processed') {
      return 'Booking Already Processed';
    } else {
      return 'Action Failed';
    }
  };

  const getMessage = () => {
    if (status === 'success') {
      return action === 'approve'
        ? 'The booking has been successfully approved. The user has been notified.'
        : 'The booking has been rejected. The user has been notified.';
    } else if (status === 'already-processed') {
      return `This booking has already been processed. Its current status is: ${currentStatus}.`;
    } else {
      return 'There was an error processing your request. Please try again or log in to the system to manage bookings.';
    }
  };

  const getIcon = () => {
    if (status === 'success') {
      return action === 'approve'
        ? <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        : <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />;
    } else if (status === 'already-processed') {
      return <AlertTriangle className="h-16 w-16 text-amber-500 mx-auto mb-4" />;
    } else {
      return <XCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />;
    }
  };

  // Determine alert message type based on status
  const alertMessage: Message | null = status === 'success' ?
    {
      type: 'success',
      text: action === 'approve' ? 'Booking approved successfully!' : 'Booking rejected successfully!'
    } :
    status === 'already-processed' ?
      {
        type: 'warning',
        text: `This booking has already been ${currentStatus}.`
      } :
      status === 'error' ?
        {
          type: 'error',
          text: 'An error occurred while processing your request.'
        } : null;

  return (
    <BasePageLayout
      pageTitle={getTitle()}
      alertMessage={alertMessage}
    >
      <div className="max-w-md mx-auto text-center">
        {getIcon()}

        <p className="mb-6">{getMessage()}</p>

        <div className="flex justify-center mt-8">
          <Button
            onClick={handleNavigation}
            className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}
            size="lg"
          >
            {isLoggedIn ? 'Go to Dashboard' : 'Go to Login'}
          </Button>
        </div>
      </div>
    </BasePageLayout>
  );
};

export default EmailActionConfirmation;