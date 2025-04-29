import React, { useState, useEffect, useRef } from 'react';
import { Loader } from "lucide-react";

// Import components
import InfrastructureSelector from '../components/_InfrastructureSelector';
import BookingManagementViews from './BookingManagementViews';
import BookingManagementTabs from './BookingManagementTabs';
import BasePageLayout from '@/components/_BasePageLayout';

import {
    Infrastructure,
    BookingEntry,
    Message,
    forceUpdatePastBookings,
    fetchAllBookingEntries,
    SortConfig,
    BookingStatus,
    TimeslotStatus
} from '@/utils';

import { useTranslation } from 'react-i18next';

/**
 * Interface for concentrating all of the information about the current filtering 
 * and sorting state of the Booking Management page.
 */
export interface FilterSortState {
    // BookingManagementViews
    viewsViewMode: 'calendar' | 'list';
    viewsTypeFilter: 'all' | 'timeslots' | 'bookings';
    viewsDayFilter: string,

    // BookingManagementTabs
    activeTab: string;

    bookingsSearchQuery: string;
    bookingsDayFilter: string;
    selectedBookingStatusFilters: BookingStatus[];
    selectedBookingDateFilters: string[];
    bookingsSortConfig: SortConfig<BookingEntry>;

    timeslotDayFilter: string;
    selectedTimeslotStatusFilters: TimeslotStatus[];
    selectedTimeslotDateFilters: string[];
    timeslotsSortConfig: SortConfig<BookingEntry>;
    selectedTimeslots: number[]; // Selected timeslot IDs (for batch operations)
}

// Default filter state
const defaultFilterState: FilterSortState = {
    viewsViewMode: 'calendar',
    viewsTypeFilter: 'all',
    viewsDayFilter: '',

    activeTab: 'bookings',

    bookingsSearchQuery: '',
    bookingsDayFilter: '',
    selectedBookingStatusFilters: [],
    selectedBookingDateFilters: [],
    bookingsSortConfig: { key: 'booking_date', direction: 'desc' },

    timeslotDayFilter: '',
    selectedTimeslotStatusFilters: [],
    selectedTimeslotDateFilters: [],
    timeslotsSortConfig: { key: 'booking_date', direction: 'desc' },
    selectedTimeslots: [],
};

const BookingManagement: React.FC = () => {
    const [selectedInfrastructure, setSelectedInfrastructure] = useState<Infrastructure | undefined>(undefined);
    const [bookingEntries, setBookingEntries] = useState<BookingEntry[]>([]);
    const [isLoadingEntries, setIsLoadingEntries] = useState<boolean>(false);
    const [message, setMessage] = useState<Message | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Store filter state for persistence
    const [filterState, setFilterState] = useState<FilterSortState>(defaultFilterState);

    // Ref to store scroll position
    const scrollPositionRef = useRef<number>(0);

    const { t } = useTranslation();

    // Check for refresh flag from email action completion
    useEffect(() => {
        const shouldRefresh = sessionStorage.getItem('refreshBookingData');
        if (shouldRefresh === 'true') {
            // Clear the flag
            sessionStorage.removeItem('refreshBookingData');
            // Trigger a refresh once an infrastructure is selected
            if (selectedInfrastructure) {
                setRefreshTrigger(prev => prev + 1);
                // Show a success message
                setMessage({
                    type: 'success',
                    text: 'Booking status updated successfully via email action'
                });
                setTimeout(() => setMessage(null), 5000);
            }
        }
    }, [selectedInfrastructure]);

    // Save scroll position before refreshing data
    useEffect(() => {
        const saveScrollPosition = () => {
            scrollPositionRef.current = window.scrollY;
        };

        // Save position before refresh
        if (refreshTrigger > 0) {
            saveScrollPosition();
        }
    }, [refreshTrigger]);

    // Restore scroll position after data is loaded
    useEffect(() => {
        if (!isLoadingEntries && refreshTrigger > 0) {
            // Use setTimeout to ensure the DOM has updated
            setTimeout(() => {
                window.scrollTo({
                    top: scrollPositionRef.current,
                    behavior: 'auto' // Use 'auto' instead of 'smooth' to prevent visible scrolling
                });
            }, 0);
        }
    }, [isLoadingEntries, bookingEntries]);

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
        setTimeout(() => setMessage(null), 5000); // Clear message after 5 seconds
    };

    const handleError = (text: string) => {
        setMessage({ type: 'error', text });
        setTimeout(() => setMessage(null), 5000);
    };

    // Handle batch updating of past bookings/timeslots statuses
    const handleUpdatePastBookings = async () => {
        try {
            await forceUpdatePastBookings();
            setRefreshTrigger(prev => prev + 1); // Refresh the data after status updates
            handleSuccess("Updated past entries successfully");
        } catch (error) {
            console.error('Error updating past bookings:', error);
            handleError('An error occurred while updating past bookings');
        }
    };

    // Handler for updating filter state
    const handleFilterStateChange = (newState: Partial<FilterSortState>) => {
        setFilterState(prevState => ({
            ...prevState,
            ...newState
        }));
    };

    return (
      <BasePageLayout
        pageTitle={t("bookingsAndAvailableTimeManagement")}
        showDashboardButton
        alertMessage={message}
      >
        <p className="text-xl pb-1">{t("selectInfrastructure")}</p>
        <InfrastructureSelector
          onSelectInfrastructure={handleInfrastructureSelected}
          onError={handleError}
        />

        {isLoadingEntries && selectedInfrastructure && (
          <div className="flex justify-center my-8">
            <Loader className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">{t("loadingBookingData")}</span>
          </div>
        )}

        {!isLoadingEntries && selectedInfrastructure && (
          <>
            <p className="text-xl">{t("viewBookingsAndTimeSlots")}</p>
            <p className="explanation-text1 pb-1">
              {t("viewBookingsAndTimeSlotsExplanation")}
            </p>
            <BookingManagementViews
              bookingEntries={bookingEntries}
              filterState={filterState}
              onFilterStateChange={handleFilterStateChange}
            />

            <p className="text-xl">{t("manageBookingsAndTimeSlots")}</p>
            <p className="explanation-text1 pb-1">
              {t("manageBookingsAndTimeSlotsExplanation")}
            </p>
            <BookingManagementTabs
              selectedInfrastructure={selectedInfrastructure}
              bookingEntries={bookingEntries}
              onSuccess={handleSuccess}
              onError={handleError}
              onUpdatePastBookings={handleUpdatePastBookings}
              onDataChange={() => setRefreshTrigger((prev) => prev + 1)}
              filterState={filterState}
              onFilterStateChange={handleFilterStateChange}
            />
          </>
        )}
      </BasePageLayout>
    );
};

export default BookingManagement;