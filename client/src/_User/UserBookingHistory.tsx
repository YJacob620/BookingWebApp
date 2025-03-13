import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftCircle, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import types and utilities from shared files
import {
  formatDate,
  formatTimeString,
  isWithin24Hours,
  getStatusColor,
  getBookingStatusOptions,
  fetchAllUserBookings,
  userCancelBooking,
  getDateFilterOptions,
  BookingEntry,
} from '@/_utils';
import { LOGIN, USER_DASHBOARD } from '@/RoutePaths';
import TruncatedTextCell from '@/components/ui/_TruncatedTextCell';



const BookingHistory = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<string>('all');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate(LOGIN);
      return;
    }

    fetchBookings();
  }, [navigate]);

  // Apply filters when bookings, status filter, or search query changes
  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, searchQuery, dateFilter]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);

      const data = await fetchAllUserBookings();
      setBookings(data);

    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Unable to load your bookings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...bookings];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Apply date filter
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const filterBookings = (bookings: typeof filtered, dateFilter: string) => {
      return bookings.filter(({ booking_date }) => {
        const bookingDate = new Date(booking_date);

        switch (dateFilter) {
          case 'today':
            return bookingDate.toISOString().split('T')[0] === now.toISOString().split('T')[0]; // Exact match
          case 'upcoming':
            return bookingDate >= startOfToday; // Include today and future dates
          case 'past':
            return bookingDate < startOfToday; // Only past dates
          default:
            return true; // No filtering applied
        }
      });
    };

    filtered = filterBookings(filtered, dateFilter);

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
      ? 'Are you sure you want to cancel this booking request?'
      : 'Are you sure you want to cancel this approved booking?';

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
      setError('Unable to cancel your booking. Please try again later.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen general-container flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Card className="general-container">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-start mb-6">
          <Button
            onClick={() => navigate(USER_DASHBOARD)}
            className="back-button"
          >
            <ArrowLeftCircle className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1>Booking History & Management</h1>
        </div>

        {error && (
          <Alert className="mb-6 alert-error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card className="card1 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative md:flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search infrastructure, location, or purpose..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}
              >
                <SelectTrigger id="status-filter" className="md:w-40">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  {getBookingStatusOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={dateFilter}
                onValueChange={setDateFilter}
              >
                <SelectTrigger id="date-filter" className="md:w-40">
                  <SelectValue placeholder="All Dates" />
                </SelectTrigger>
                <SelectContent>
                  {getDateFilterOptions().map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Bookings table */}
        <Card className="card1">
          <p className="explanation-text1 py-2">You can only cancel bookings if they don't occur in the next 24 hours.</p>
          <CardContent>
            {filteredBookings.length > 0 ? (
              <div className="table-wrapper">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead>Infrastructure</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Purpose</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBookings.map((booking) => (
                      <TableRow
                        key={booking.id}
                        className="border-gray-700 def-hover"
                      >
                        <TableCell className="font-medium">
                          {booking.infrastructure_name}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatDate(booking.booking_date)}
                        </TableCell>
                        <TableCell className="text-center whitespace-nowrap">
                          {formatTimeString(booking.start_time)} - {formatTimeString(booking.end_time)}
                        </TableCell>
                        <TableCell className="text-center">
                          {booking.infrastructure_location || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={getStatusColor(booking.status)}>
                            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TruncatedTextCell
                          text={booking.purpose}
                          maxLength={30}
                          cellClassName="text-center"
                        />
                        <TableCell className="text-center">
                          {(booking.status === 'pending' || booking.status === 'approved') && (() => {
                            const isWithin24h = isWithin24Hours(booking.booking_date, booking.start_time);
                            return (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleCancelBooking(booking.id, booking.status)}
                                  className="discard h-7"
                                  disabled={isWithin24h}
                                  title={isWithin24h ? "Cannot cancel bookings within 24 hours" : "Cancel this booking"}
                                >
                                  Cancel
                                </Button>

                                {isWithin24h && (
                                  <div className="text-xs text-amber-500 mt-1">
                                    Within 24h
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                {bookings.length > 0
                  ? 'No bookings match your current filters.'
                  : 'You have no booking history.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Card>
  );
};

export default BookingHistory;