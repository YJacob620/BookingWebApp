import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle } from "lucide-react";

// Import components
import InfrastructureSelector from './InfrastructureSelector';
import BookingManagementViews from './BookingManagementViews';
import BookingManagementTabs from './BookingManagementTabs';

import { Infrastructure, Message } from '@/utils';

const BookingManagement: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading: authLoading } = useAdminAuth();
    const [selectedInfraId, setSelectedInfraId] = useState<number | null>(null);
    const [selectedInfrastructure, setSelectedInfrastructure] = useState<Infrastructure | undefined>(undefined);
    const [message, setMessage] = useState<Message | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const handleInfrastructureSelected = (infraId: number, infrastructure: Infrastructure) => {
        setSelectedInfraId(infraId);
        setSelectedInfrastructure(infrastructure);
    };

    // Handle messages displayed to the user
    const handleSuccess = (text: string) => {
        setMessage({ type: 'success', text });
        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
        // Trigger refresh of data
        setRefreshTrigger(prev => prev + 1);
    };

    const handleError = (text: string) => {
        setMessage({ type: 'error', text });
        // Clear message after 5 seconds
        setTimeout(() => setMessage(null), 5000);
    };

    // Handle batch updating of past bookings/timeslots statuses
    const handleUpdatePastBookings = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/bookings/force-bookings-status-update', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                handleSuccess(
                    `${data.completedCount} bookings marked as completed, ` +
                    `${data.expiredBookingsCount} bookings marked as expired, and ` +
                    `${data.expiredTimeslotsCount} timeslots marked as expired.`
                );

                // Refresh the data after status updates
                setRefreshTrigger(prev => prev + 1);
            } else {
                const errorData = await response.json();
                handleError(errorData.message || 'Failed to update past bookings');
            }
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
                        onClick={() => navigate('/admin-dashboard')}
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

                {selectedInfrastructure && selectedInfraId && (
                    <>
                        <p className="text-xl">View Bookings and Timeslots</p>
                        <p className="explanation-text1 pb-1">
                            View future timeslots and bookings. Toggle between calendar-view and list-view to see details.
                            <br />In calendar-view, clicking on an active date will take you to a filtered list-view of this date.
                        </p>
                        <BookingManagementViews
                            infrastructureId={selectedInfraId}
                            selectedInfrastructure={selectedInfrastructure}
                            refreshTrigger={refreshTrigger}
                            onDateClick={(date) => {
                                // This will be handled internally in the CalendarListView component
                            }}
                            onError={handleError}
                        />

                        <p className="text-xl">Manage Bookings and Timeslots</p>
                        <p className="explanation-text1 pb-1">
                            View and manage all bookings/timeslots, including past ones.
                        </p>
                        <BookingManagementTabs
                            infrastructureId={selectedInfraId}
                            selectedInfrastructure={selectedInfrastructure}
                            refreshTrigger={refreshTrigger}
                            onSuccess={handleSuccess}
                            onError={handleError}
                            onUpdatePastBookings={handleUpdatePastBookings}
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