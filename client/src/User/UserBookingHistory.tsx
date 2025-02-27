import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface Booking {
  id: number;
  infrastructure_name: string;
  infrastructure_location: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'expired' | 'canceled';
  purpose: string;
  created_at: string;
}

const BookingHistory = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    fetchBookings(token);
  }, [navigate]);

  // Apply filters when bookings, status filter, or search query changes
  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, searchQuery]);

  const fetchBookings = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/bookings/user/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch bookings');
      }

      const data = await response.json();

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

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.infrastructure_name.toLowerCase().includes(query) ||
        (booking.infrastructure_location && booking.infrastructure_location.toLowerCase().includes(query)) ||
        booking.purpose.toLowerCase().includes(query)
      );
    }
    setFilteredBookings(filtered);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-UK', {
      weekday: 'long',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
  };

  // Format time string to be displayed
  const formatTimeString = (timeString: string): string => {
    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString('en-UK', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Get color for status badge
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-700 text-yellow-100';
      case 'approved':
        return 'bg-green-700 text-green-100';
      case 'rejected':
        return 'bg-red-700 text-red-100';
      case 'completed':
        return 'bg-blue-700 text-blue-100';
      case 'expired':
        return 'bg-gray-700 text-gray-100';
      case 'canceled':
        return 'bg-purple-700 text-purple-100';
      default:
        return 'bg-gray-700 text-gray-100';
    }
  };

  // Check if a booking is within 24 hours
  const isWithin24Hours = (bookingDate: string, startTime: string): boolean => {
    // Ensure we're using the format returned by the server (YYYY-MM-DD)
    // MySQL's DATE_FORMAT will return dates in this format
    const bookingDateTime = new Date(`${bookingDate}T${startTime}`);
    const now = new Date();

    // Double-check valid date object
    if (isNaN(bookingDateTime.getTime())) {
      console.error("Invalid date created from:", bookingDate, startTime);
      return true; // Fail safely - treat invalid dates as within 24 hours to prevent cancellation
    }

    const differenceInHours = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    return differenceInHours <= 24;
  };

  const handleCancelBooking = async (bookingId: number, status: string) => {
    const confirmMessage = status === 'pending'
      ? 'Are you sure you want to cancel this booking request?'
      : 'Are you sure you want to cancel this approved booking?';

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel booking');
      }

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
            onClick={() => navigate('/user-dashboard')}
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
              <div className="flex flex-col space-y-2 flex-grow">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search infrastructure, location, or purpose..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex-shrink-0 w-full md:w-60">
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="card1">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="canceled">Canceled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bookings table */}
        <Card className="card1">
          <p className="explanation-text1 py-2">You can only cancel bookings if they don't occur in the next 24 hours.</p>
          <CardContent>
            {filteredBookings.length > 0 ? (
              <div className="rounded-md border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead>Infrastructure</TableHead>
                      <TableHead className="text-center">Date</TableHead>
                      <TableHead className="text-center">Time</TableHead>
                      <TableHead className="text-center">Location</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Purpose</TableHead>
                      <TableHead className="text-center">Actions</TableHead>
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

                        <TableCell
                          className="relative max-w-xs overflow-hidden text-ellipsis whitespace-nowrap"
                          dir={/[\u0590-\u05FF]/.test(booking.purpose) ? "rtl" : "ltr"}
                        >
                          <span title={booking.purpose}>
                            {booking.purpose.length > 30 ? booking.purpose.substring(0, 30) + "..." : booking.purpose}
                          </span>
                        </TableCell>

                        <TableCell className="text-center">
                          {(booking.status === 'pending' || booking.status === 'approved') && (() => {
                            // Calculate once and store the result
                            const isWithin24h = booking.status === 'approved' &&
                              isWithin24Hours(booking.booking_date, booking.start_time);

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
