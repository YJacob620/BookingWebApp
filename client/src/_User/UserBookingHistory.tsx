import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";

import PaginatedTable from '@/components/_PaginatedTable';
import { TableCell } from "@/components/ui/table";
import BookingDetailsDialog from '@/components/_BookingDetailsDialog'; // Add this import
import { useTranslation } from 'react-i18next';


import {
  formatDate,
  formatTimeString,
  isWithin24Hours,
  getStatusColor,
  fetchUserBookings,
  userCancelBooking,
  BookingEntry,
  Message,
  BOOKING_STATUSES,
} from '@/utils';
import { applyDateFilters, applyStatusFilters, createFilterOptions, DATE_FILTER_OPTIONS } from '@/utils/filterUtils';
import MultiSelectFilter from '@/components/_MultiSelectFilter';
import BasePageLayout from '@/components/_BasePageLayout';

const BookingHistory = () => {
  // Existing state
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<Message | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDateFilters, setSelectedDateFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const { t } = useTranslation();


  // New state for booking details dialog
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchBookings();
  }, [navigate]);

  // Apply filters when bookings or filters change
  useEffect(() => {
    applyFilters();
  }, [bookings, selectedStatuses, selectedDateFilters, searchQuery]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);

      const data = await fetchUserBookings();
      setBookings(data);

    } catch (err) {
      console.error('Error fetching bookings:', err);
      setMessage({
        type: 'error',
        text: t('userBookHist.msgErrBookFetch', 'Unable to load your bookings. Please try again later.')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Apply status filters
    filtered = applyStatusFilters(filtered, selectedStatuses);

    // Apply date filters
    filtered = applyDateFilters(filtered, selectedDateFilters);

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.infrastructure_name.toLowerCase().includes(query) ||
        (booking.infrastructure_location && booking.infrastructure_location.toLowerCase().includes(query)) ||
        booking.purpose?.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const handleCancelBooking = async (bookingId: number, status: string) => {
    const confirmMessage = status === 'pending'
      ? t('userBookHist.cancelBookQuest', 'Are you sure you want to cancel this booking request?')
      : t('userBookHist.cancelAppBookQuest', 'Are you sure you want to cancel this approved booking?');

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      await userCancelBooking(bookingId);

      // Update the booking status locally
      setBookings(prevBookings =>
        prevBookings.map(booking =>
          booking.id === bookingId
            ? { ...booking, status: 'canceled' }
            : booking
        )
      );
    } catch (err) {
      console.error('Error canceling booking:', err);
      setMessage({
        type: 'error',
        text: t('userBookHist.msgErrBookCancel', 'Unable to cancel your booking. Please try again later.')
      });
    }
  };

  // Define table columns for the PaginatedTable component
  const columns = [
    {
      key: 'infrastructure',
      header: t('Infrastructure'),
      cell: (booking: BookingEntry) => (
        <TableCell className="font-medium">
          {booking.infrastructure_name}
        </TableCell>
      )
    },
    {
      key: 'date',
      header: 'Date',
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          {formatDate(booking.booking_date)}
        </TableCell>
      ),
    },
    {
      key: 'time',
      header: t('Time'),
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center whitespace-nowrap">
          {formatTimeString(booking.start_time)} - {formatTimeString(booking.end_time)}
        </TableCell>
      ),
    },
    {
      key: 'location',
      header: t('Location'),
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          {booking.infrastructure_location || 'N/A'}
        </TableCell>
      ),
    },
    {
      key: 'details',
      header: t('Details'),
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          <Button
            size="sm"
            variant="custom1"
            onClick={() => {
              setSelectedBookingId(booking.id);
              setIsDetailsDialogOpen(true);
            }}
          >
            <FileText className="h-4 w-4 mr-1" />
            View
          </Button>
        </TableCell>
      ),
    },
    {
      key: 'status',
      header: t('Status'),
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          <Badge className={getStatusColor(booking.status)}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </TableCell>
      ),
    },
    {
      key: 'actions',
      header: t('Actions'),
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          {(booking.status === 'pending' || booking.status === 'approved') && (() => {
            const isWithin24h = isWithin24Hours(booking.booking_date, booking.start_time);
            return (
              <>
                <Button
                  size="sm"
                  variant={"custom2"}
                  onClick={() => handleCancelBooking(booking.id, booking.status)}
                  className="discard"
                  disabled={isWithin24h}
                  title={isWithin24h ? t('userBookHist.notWithin24h', "Cannot cancel bookings within 24 hours") : t('userBookHist.Cancel this booking')}
                >
                  {t('Cancel')}
                </Button>

                {isWithin24h && (
                  <div className="text-xs text-amber-500 mt-1">
                    {t('userBookHist.Within 24h')}
                  </div>
                )}
              </>
            );
          })()}
        </TableCell>
      ),
    }
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen general-container flex items-center justify-center">
        <div className="text-xl">{t('Loading')}</div>
      </div>
    );
  }

  return (
    <BasePageLayout
      pageTitle={t('userBookHist.title', "Booking History & Management")}
      showDashboardButton
      alertMessage={message}
      className={"w-250"}
    >
      {/* Filters */}
      <Card className="card1">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 -mb-2">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('userBookHist.searchPlaceholder', "Search infrastructure, location, or purpose...")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            {/* Filter controls in a responsive grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Status filter using MultiSelectFilter */}
              <MultiSelectFilter
                label={t("Status")}
                options={createFilterOptions(BOOKING_STATUSES, getStatusColor)}
                selectedValues={selectedStatuses}
                onSelectionChange={setSelectedStatuses}
                variant="badge"
                placeholder={t('userBookHist.All Statuses')}
              />

              {/* Date filter using MultiSelectFilter */}
              <MultiSelectFilter
                label={t("Date")}
                options={createFilterOptions(DATE_FILTER_OPTIONS)}
                selectedValues={selectedDateFilters}
                onSelectionChange={setSelectedDateFilters}
                placeholder={t("All Dates")}
              />
            </div>
          </div>
        </CardContent>

        {/* Bookings table */}
        <p dir='auto' className="explanation-text1 pb-2">{t('userBookHist.bookCancelExplain')}</p>
        {/* You can only cancel bookings if they don't occur in the next 24 hours. */}
        <CardContent>
          {/* PaginatedTable with integrated pagination */}
          <PaginatedTable
            data={filteredBookings}
            columns={columns}
            initialRowsPerPage={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            emptyMessage={t('userBookHist.noBookHist', "You have no booking history.")}
            noResults={
              bookings.length > 0 ? (
                <div className="text-center py-8 text-gray-400">
                  {t('noBookMatch', "No bookings match your current filters.")}
                </div>
              ) : null
            }
          />
        </CardContent>
      </Card>
      <BookingDetailsDialog
        bookingId={selectedBookingId}
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
      />
    </BasePageLayout>
  );
};

export default BookingHistory;