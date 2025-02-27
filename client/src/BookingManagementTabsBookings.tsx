import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MoreHorizontal,
  Check,
  X,
  CalendarX
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

import { Booking, Infrastructure } from '@/types';
import { formatDate, formatTimeString } from '@/utils';

interface BookingListProps {
  infrastructureId: number;
  selectedInfrastructure: Infrastructure | undefined;
  onStatusChange: (message: string) => void;
  onError: (message: string) => void;
  refreshTrigger: number;
}

const BookingManagementTabsBookings: React.FC<BookingListProps> = ({
  infrastructureId,
  selectedInfrastructure,
  onStatusChange,
  onError,
  refreshTrigger
}) => {
  // State for bookings and filters
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('upcoming');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load bookings when infrastructure changes or after actions
  useEffect(() => {
    if (infrastructureId) {
      fetchBookings();
    }
  }, [infrastructureId, refreshTrigger]);

  // Apply filters when bookings, status filter, date filter, or search query changes
  useEffect(() => {
    applyFilters();
  }, [bookings, statusFilter, dateFilter, searchQuery]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      // Fetch all bookings for this infrastructure
      const response = await fetch(`http://localhost:3001/api/bookings/infrastructure/${infrastructureId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setBookings(data);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      onError('Error loading bookings. Please try again.');
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

    console.log("now", now);

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
        booking.user_email.toLowerCase().includes(query) ||
        booking.purpose.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const handleStatusChange = async (bookingId: number, newStatus: string) => {
    try {
      const token = localStorage.getItem('token');

      let confirmMessage = '';
      if (newStatus === 'approved') {
        confirmMessage = 'Are you sure you want to approve this booking? All other pending bookings for this time slot will be automatically rejected.';
      } else if (newStatus === 'rejected') {
        confirmMessage = 'Are you sure you want to reject this booking?';
      } else if (newStatus === 'canceled') {
        confirmMessage = 'Are you sure you want to cancel this approved booking?';
      }

      if (!confirm(confirmMessage)) {
        return;
      }

      const response = await fetch(`http://localhost:3001/api/bookings/${bookingId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update booking status to ${newStatus}`);
      }

      const data = await response.json();
      let successMessage = `Booking status updated to ${newStatus}`;

      if (data.rejectedCount && data.rejectedCount > 0) {
        successMessage += `. Additionally, ${data.rejectedCount} overlapping booking(s) were automatically rejected.`;
      }

      onStatusChange(successMessage);
      fetchBookings(); // Refresh the bookings list
    } catch (error) {
      console.error('Error updating booking status:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Get color for status badge
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-700 text-yellow-100';
      case 'approved':
        return 'bg-green-700 text-green-100';
      case 'rejected':
        return 'bg-red-600 text-red-100';
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

  return (
    <div className="space-y-4">
      {/* Description section without the update button */}
      <div className="mb-4">
        <p className="explanation-text1">
          Manage booking requests and approvals.
        </p>
      </div>

      {/* Filter controls */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col space-y-2 flex-grow">
          <Label htmlFor="search-bookings">Search</Label>
          <Input
            id="search-bookings"
            placeholder="Search by email or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="status-filter">Status</Label>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
          >
            <SelectTrigger id="status-filter" className="w-[180px]">
              <SelectValue placeholder="Select Status" />
            </SelectTrigger>
            <SelectContent className="card1">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="date-filter">Date</Label>
          <Select
            value={dateFilter}
            onValueChange={setDateFilter}
          >
            <SelectTrigger id="date-filter" className="w-[180px]">
              <SelectValue placeholder="Select Date Filter" />
            </SelectTrigger>
            <SelectContent className="card1">
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="text-center py-10">Loading bookings...</div>
      ) : (
        <div className="rounded-md border border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-center">User</TableHead>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Time</TableHead>
                <TableHead className="text-center">Purpose</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length > 0 ? (
                filteredBookings.map((booking) => (
                  <TableRow
                    key={booking.id}
                    className="border-gray-700 def-hover"
                  >
                    <TableCell>
                      <div className="font-medium">{booking.user_email}</div>
                      {booking.user_role && (
                        <div className="text-xs text-gray-400">
                          {booking.user_role.charAt(0).toUpperCase() + booking.user_role.slice(1)}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      {formatDate(booking.booking_date)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {formatTimeString(booking.start_time)} - {formatTimeString(booking.end_time)}
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
                      <Badge className={`${getStatusColor(booking.status)}`}>
                        {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {booking.status === 'pending' ? (
                        <div className="flex justify-center space-x-2">
                          <Button
                            size="sm"
                            variant="default"
                            className="bg-green-700"
                            onClick={() => handleStatusChange(booking.id, 'approved')}
                          >
                            <Check />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            className="bg-red-600"
                            onClick={() => handleStatusChange(booking.id, 'rejected')}
                          >
                            <X />
                            Reject
                          </Button>
                        </div>
                      ) : booking.status === 'approved' ? (
                        <Button
                          size="sm"
                          className="discard"
                          onClick={() => handleStatusChange(booking.id, 'canceled')}
                        >
                          <CalendarX />
                          Cancel
                        </Button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="card1">
                            <DropdownMenuItem
                              className="card1-hover cursor-pointer"
                              onClick={() => {
                                // View details functionality could be added here
                                alert(`Booking ID: ${booking.id}\nDetails: ${booking.purpose}`);
                              }}
                            >
                              View Details
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <div className="text-gray-400">
                      {bookings.length > 0
                        ? 'No bookings match your current filters.'
                        : 'No bookings exist for this infrastructure.'}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default BookingManagementTabsBookings;