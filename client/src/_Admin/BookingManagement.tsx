import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle, Loader } from "lucide-react";

// Import components
import { useAdminAuth } from './useAdminAuth';
import InfrastructureSelector from './InfrastructureSelector';
import BookingManagementViews from './BookingManagementViews';
import BookingManagementTabs from './BookingManagementTabs';

import {
    Infrastructure,
    BookingEntry,
    Message,
    forceUpdatePastBookings,
    fetchAllBookingEntries
} from '@/_utils';
import { ADMIN_DASHBOARD } from '@/RoutePaths';


const BookingManagement: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading: authLoading } = useAdminAuth();

    // Infrastructure state
    const [selectedInfrastructure, setSelectedInfrastructure] = useState<Infrastructure | undefined>(undefined);

    // Booking entries state
    const [bookingEntries, setBookingEntries] = useState<BookingEntry[]>([]);
    const [isLoadingEntries, setIsLoadingEntries] = useState<boolean>(false);

    // UI state
    const [message, setMessage] = useState<Message | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch all booking entries when infrastructure is selected or refresh is triggered
    useEffect(() => {
        if (selectedInfrastructure) {
            fetchBookingEntries();
        } else {
            setBookingEntries([]);
        }
    }, [selectedInfrastructure, refreshTrigger]);

    const fetchBookingEntries = async () => {
        if (!selectedInfrastructure) return;

        try {
            setIsLoadingEntries(true);
            const data = await fetchAllBookingEntries(selectedInfrastructure.id);
            setBookingEntries(data);
        } catch (error) {
            console.error('Error fetching booking entries:', error);
            handleError('Failed to load booking data. Please try again.');
        } finally {
            setIsLoadingEntries(false);
        }
    };

    const handleInfrastructureSelected = (infrastructure: Infrastructure) => {
        setSelectedInfrastructure(infrastructure);
    };

    // Handle messages displayed to the user
    const handleSuccess = (text: string) => {
        setMessage({ type: 'success', text });
        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
    };

    const handleError = (text: string) => {
        setMessage({ type: 'error', text });
        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
    };

    // Handle batch updating of past bookings/timeslots statuses
    const handleUpdatePastBookings = async () => {
        try {
            const data = await forceUpdatePastBookings();
            handleSuccess(
                `${data.completedCount} bookings marked as completed, ` +
                `${data.expiredBookingsCount} bookings marked as expired, and ` +
                `${data.expiredTimeslotsCount} timeslots marked as expired.`
            );

            // Refresh the data after status updates
            setRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error('Error updating past bookings:', error);
            handleError('An error occurred while updating past bookings');
        }
    };

    // We'll simply return null during authentication loading
    if (authLoading) {
        return null;
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <Card className="general-container min-w-200">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-start mb-6">
                    <Button
                        onClick={() => navigate(ADMIN_DASHBOARD)}
                        className="back-button"
                    >
                        <ArrowLeftCircle className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h1>Booking & Timeslot Management</h1>
                </div>

                <p className='text-xl pb-1'>Select Infrastructure</p>
                <InfrastructureSelector
                    onSelectInfrastructure={handleInfrastructureSelected}
                    onError={handleError}
                />

                {isLoadingEntries && selectedInfrastructure && (
                    <div className="flex justify-center my-8">
                        <Loader className="h-8 w-8 animate-spin text-blue-500" />
                        <span className="ml-2">Loading booking data...</span>
                    </div>
                )}

                {!isLoadingEntries && selectedInfrastructure && (
                    <>
                        <p className="text-xl">View Bookings and Timeslots</p>
                        <p className="explanation-text1 pb-1">
                            View future timeslots and bookings. Toggle between calendar-view and list-view to see details.
                            <br />In calendar-view, clicking on an active date will take you to a filtered list-view of this date.
                        </p>
                        <BookingManagementViews
                            bookingEntries={bookingEntries}
                        />

                        <p className="text-xl">Manage Bookings and Timeslots</p>
                        <p className="explanation-text1 pb-1">
                            View and manage all bookings/timeslots, including past ones.
                        </p>
                        <BookingManagementTabs
                            selectedInfrastructure={selectedInfrastructure}
                            bookingEntries={bookingEntries}
                            onSuccess={handleSuccess}
                            onError={handleError}
                            onUpdatePastBookings={handleUpdatePastBookings}
                            onDataChange={() => setRefreshTrigger(prev => prev + 1)}
                        />
                    </>
                )}
            </div>
            {message && (
                <Alert
                    className={`${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
                >
                    <AlertDescription>{message.text}</AlertDescription>
                </Alert>
            )}
        </Card>
    );
};

export default BookingManagement;