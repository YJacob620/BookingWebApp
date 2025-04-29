import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  TableCell,
} from "@/components/ui/table";
import {
  Check,
  X,
  CalendarX,
  FileText
} from "lucide-react";
import { Badge } from "@/components/ui/badge";


import {
  formatDate,
  formatTimeString,
  getStatusColor,
  approveBooking,
  rejectOrCancelBooking,
  Infrastructure,
  BookingEntry,
  applyDateFilters,
  applyStatusFilters,
  createFilterOptions,
  BOOKING_STATUSES,
  DATE_FILTER_OPTIONS,
  BookingStatus,
} from '@/utils';
import BookingDetailsDialog from '@/components/_BookingDetailsDialog';
import MultiSelectFilter from '@/components/_MultiSelectFilter';
import PaginatedTable, { PaginatedTableColumn } from '@/components/_PaginatedTable';
import { FilterSortState } from './BookingManagement';
import { useTranslation } from 'react-i18next';

interface BookingListProps {
  items: BookingEntry[];
  selectedInfrastructure: Infrastructure | undefined;
  onStatusChange: (message: string) => void;
  onError: (message: string) => void;
  onDataChange: () => void;
  filterState: FilterSortState;
  onFilterStateChange: (newState: Partial<FilterSortState>) => void;
}

const BookingManagementTabsBookings: React.FC<BookingListProps> = ({
  selectedInfrastructure,
  items,
  onStatusChange,
  onError,
  onDataChange,
  filterState,
  onFilterStateChange
}) => {
  // Main state
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Get relevant states from filterState - use these directly instead of local state
  const {
    selectedBookingStatusFilters,
    selectedBookingDateFilters,
    bookingsSearchQuery,
    bookingsSortConfig,
    bookingsDayFilter
  } = filterState;

  // New state for booking details dialog
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { t } = useTranslation();

  // Load bookings when infrastructure changes or after actions
  useEffect(() => {
    if (selectedInfrastructure) {
      setBookings(items);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [selectedInfrastructure, items]);

  // Apply filters when bookings, status filter, date filter, or search query changes
  useEffect(() => {
    applyFilters();
  }, [bookings, selectedBookingStatusFilters, selectedBookingDateFilters, bookingsSearchQuery, bookingsDayFilter]);

  const applyFilters = () => {
    let filtered = [...bookings];

    // Apply status filters using utility function
    filtered = applyStatusFilters(filtered, selectedBookingStatusFilters);

    // Apply date filters using utility function
    filtered = applyDateFilters(filtered, selectedBookingDateFilters);

    // Apply specific day filter if set
    if (bookingsDayFilter) {
      filtered = filtered.filter(booking => {
        const bookingDate = new Date(booking.booking_date);
        const filterDate = new Date(bookingsDayFilter);

        return (
          bookingDate.getFullYear() === filterDate.getFullYear() &&
          bookingDate.getMonth() === filterDate.getMonth() &&
          bookingDate.getDate() === filterDate.getDate()
        );
      });
    }

    // Apply search query
    if (bookingsSearchQuery) {
      const query = bookingsSearchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.user_email?.toLowerCase().includes(query) ||
        booking.purpose?.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  // Clear specific day filter
  const handleClearDateFilter = () => {
    onFilterStateChange({ bookingsDayFilter: '' });
  };

  // Handle specific day filter change
  const handleDateFilterChange = (date: string) => {
    // Clear predefined date filters if specific date is set
    if (date) {
      onFilterStateChange({
        selectedBookingDateFilters: [],
        bookingsDayFilter: date
      });
    } else {
      onFilterStateChange({ bookingsDayFilter: date });
    }
  };

  const handleApproveBooking = async (bookingId: number) => {
    try {
      if (!confirm(t('questionApproveBooking','Are you sure you want to approve this booking?'))) {
        return;
      }

      await approveBooking(bookingId);
      const successMessage = t('Booking approved successfully');

      onStatusChange(successMessage);
      onDataChange(); // Refresh the bookings list
    } catch (error) {
      console.error('Error approving booking:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    try {
      if (!confirm(t('questionRejectBooking')+'Are you sure you want to reject this booking? '
        + 'This will automatically create a new available timeslot at the same time.')) {
        return;
      }
// 'Are you sure you want to reject this booking? This will automatically create a new available timeslot at the same time.'
      await rejectOrCancelBooking(bookingId, 'rejected');
      onStatusChange(`Booking rejected successfully`);
      onDataChange(); // Refresh the bookings list
    } catch (error) {
      console.error('Error rejecting booking:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleCancelBooking = async (bookingId: number) => {
    try {
      if (!confirm(t('questionCancelAppBooking','Are you sure you want to cancel this approved booking?'))) {
        return;
      }

      await rejectOrCancelBooking(bookingId, 'canceled');
      onStatusChange(`Booking canceled successfully`);
      onDataChange(); // Refresh the bookings list
    } catch (error) {
      console.error('Error canceling booking:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Define table columns for the PaginatedTable component
  const columns: PaginatedTableColumn<BookingEntry>[] = [
    {
      key: 'user_email',
      header: t('User'),
      cell: (booking: BookingEntry) => (
        <TableCell>
          <div className="font-medium">{booking.user_email}</div>
          {booking.user_role && (
            <div className="text-xs text-gray-400">{/*todo options for user role?*/}
              {booking.user_role.charAt(0).toUpperCase() + booking.user_role.slice(1)}
            </div>
          )}
        </TableCell>
      ),
      sortable: true
    },
    {
      key: 'booking_date',
      header: t('Date'),
      cell: (booking: BookingEntry) => (
        <TableCell>
          {formatDate(booking.booking_date)}
        </TableCell>
      ),
      sortable: true,
      defaultSort: 'desc'
    },
    {
      key: 'start_time',
      header: t('Time'),
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center whitespace-nowrap">
          {formatTimeString(booking.start_time)} - {formatTimeString(booking.end_time)}
        </TableCell>
      ),
    },
    {
      key: 'details',
      header: t('Details'),
      cell: (booking: BookingEntry) => (
        <TableCell>
          <Button
            size="sm"
            variant="custom1"
            onClick={() => {
              setSelectedBookingId(booking.id);
              setIsDetailsDialogOpen(true);
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            {t('View')}
          </Button>
        </TableCell>
      ),
      className: 'justify-center'
    },
    {
      key: 'status',
      header: t('Status'),
      cell: (booking: BookingEntry) => (
        <TableCell>
          <Badge className={getStatusColor(booking.status)}>{/*todo  translate*/}
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (booking: BookingEntry) => (
        <TableCell>
          {(() => {
            switch (booking.status) {
              case 'pending':
                return (
                  <div className="flex justify-center space-x-2">
                    <Button
                      variant={"custom3_approve"}
                      size="sm"
                      onClick={() => handleApproveBooking(booking.id)}
                    >
                      <Check className="h-4 w-4" />
                      {t('Approve')}
                    </Button>
                    <Button
                      variant={"custom4_reject"}
                      size="sm"
                      onClick={() => handleRejectBooking(booking.id)}
                    >
                      <X className="h-4 w-4" />
                      {t('Reject')}
                    </Button>
                  </div>
                );
              case 'approved':
                return (
                  <Button
                    size="sm"
                    variant={"custom2"}
                    className="discard"
                    onClick={() => handleCancelBooking(booking.id)}
                  >
                    <CalendarX className="mr-1 h-4 w-4" />
                    {t('Cancel')}
                  </Button>
                );
              default:
                return null;
            }
          })()}
        </TableCell>
      ),
      className: 'text-center'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <p className="explanation-text1">
          {t('manageBookingExplaintion','Manage booking requests and approvals.')}
        </p>
      </div>

      {/* Filter controls */}
      <div className="grid grid-cols-2 grid-rows-2 gap-4">
        <div>
          <p>{t('Search')}</p>
          <Input
            id="search-bookings"
            placeholder={t('Search by email or purpose',"Search by email or purpose...")}
            value={bookingsSearchQuery}
            onChange={(e) => onFilterStateChange({ bookingsSearchQuery: e.target.value })}
            className='h-10'
          />
        </div>
        <div>
          <p>{t('Filter by Date')}</p>
          <div className="flex space-x-2">
            <Input
              id="date-filter-input"
              type="date"
              value={bookingsDayFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              disabled={selectedBookingDateFilters.length > 0}
              className='h-10'
            />
            {bookingsDayFilter && (
              <Button
                variant="custom5"
                onClick={handleClearDateFilter}
                className="p-2"
              >
                {t('Clear')}
              </Button>
            )}
          </div>
        </div>

        <MultiSelectFilter
          label={t("Filter by Status")}
          options={createFilterOptions(BOOKING_STATUSES, getStatusColor)}
          selectedValues={selectedBookingStatusFilters}
          onSelectionChange={(values) =>
            onFilterStateChange({ selectedBookingStatusFilters: values as BookingStatus[] })}
          variant="badge"
          placeholder={t("All Statuses")}
        />

        <MultiSelectFilter
          label={t("Filter by Time-Period")}
          options={createFilterOptions(DATE_FILTER_OPTIONS)}
          selectedValues={selectedBookingDateFilters}
          onSelectionChange={(values) =>
            onFilterStateChange({ selectedBookingDateFilters: values })}
          placeholder={t("All Times")}
          disabled={!!bookingsDayFilter}
          triggerClassName={bookingsDayFilter ? 'opacity-50' : ''}
        />
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="text-center py-10">{t('Loading bookings','Loading bookings...')}</div>
      ) : (
        <div className="space-y-4">
          <PaginatedTable
            data={filteredBookings}
            columns={columns}
            initialRowsPerPage={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            emptyMessage={t('noBookingExistForInf',"No bookings exist for this infrastructure.")}
            sortConfig={bookingsSortConfig}
            onSortChange={(newSortConfig) => onFilterStateChange({ bookingsSortConfig: newSortConfig })}
            noResults={
              bookings.length > 0 ? (
                <div className="text-gray-400">
                  {t('noBookMatch')}
                </div>
              ) : null
            }
          />
          <BookingDetailsDialog
            bookingId={selectedBookingId}
            isOpen={isDetailsDialogOpen}
            onClose={() => setIsDetailsDialogOpen(false)}
          />
        </div>
      )}
    </div>
  );
};

export default BookingManagementTabsBookings;