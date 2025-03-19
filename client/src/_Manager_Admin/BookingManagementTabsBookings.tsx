import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TableCell,
} from "@/components/ui/table";
import {
  Check,
  X,
  CalendarX,
  ArrowUpDown,
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
  SortConfig
} from '@/_utils';
import { createStatusFilterOptions, DATE_FILTER_OPTIONS, applyDateFilters, applyStatusFilters } from '@/_utils/filterUtils';
import MultiSelectFilter from '@/components/MultiSelectFilter';
import TruncatedTextCell from '@/components/_TruncatedTextCell';
import PaginatedTable from '@/components/_PaginatedTable';

interface BookingListProps {
  items: BookingEntry[];
  selectedInfrastructure: Infrastructure | undefined;
  onStatusChange: (message: string) => void;
  onError: (message: string) => void;
  onDataChange: () => void;
}

const BookingManagementTabsBookings: React.FC<BookingListProps> = ({
  selectedInfrastructure,
  items,
  onStatusChange,
  onError,
  onDataChange
}) => {
  // State for bookings and filters
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<BookingEntry[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDateFilters, setSelectedDateFilters] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sortConfig, setSortConfig] = useState<SortConfig<BookingEntry>>({ key: 'booking_date', direction: 'desc' });

  // Generate status filter options from booking statuses
  const statusFilterOptions = useMemo(() => {
    // Get unique statuses from bookings 
    const statuses = [...new Set(items.map(item => item.status))];
    return createStatusFilterOptions(statuses);
  }, [items]);

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
  }, [bookings, selectedStatuses, selectedDateFilters, searchQuery]);

  // Handle sorting
  const handleSort = (key: keyof BookingEntry) => {
    setSortConfig(prev => {
      // If clicking on the same column that's already sorted
      if (prev.key === key) {
        return {
          key,
          direction: prev.direction === 'asc' ? 'desc' : 'asc'
        };
      }
      // If clicking on a different column
      else {
        // For booking_date, default to 'desc' (newest first)
        if (key === 'booking_date') {
          return {
            key,
            direction: 'desc'
          };
        }
        // For other columns, default to 'asc'
        return {
          key,
          direction: 'asc'
        };
      }
    });
  };

  const sortedData = useMemo(() => {
    let sorted = [...filteredBookings];

    if (sortConfig.key) {
      sorted.sort((a, b) => {
        // Sort by date
        if (sortConfig.key === 'booking_date') {
          const dateA = new Date(a.booking_date);
          const dateB = new Date(b.booking_date);

          // First compare dates
          const dateCompare = sortConfig.direction === 'desc'
            ? dateB.getTime() - dateA.getTime()
            : dateA.getTime() - dateB.getTime();

          // If dates are equal, sort by start_time
          if (dateCompare === 0) {
            const timeA = a.start_time;
            const timeB = b.start_time;
            return sortConfig.direction === 'asc'
              ? timeA.localeCompare(timeB)
              : timeB.localeCompare(timeA);
          }

          return dateCompare;
        }

        // Sort by user
        else if (sortConfig.key === 'user_email') {
          const valA = a[sortConfig.key] || '';
          const valB = b[sortConfig.key] || '';

          return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortConfig.direction === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        return 0;
      });
    }

    return sorted;
  }, [filteredBookings, sortConfig]);

  const applyFilters = () => {
    let filtered = [...bookings];

    // Apply status filters using utility function
    filtered = applyStatusFilters(filtered, selectedStatuses);

    // Apply date filters using utility function
    filtered = applyDateFilters(filtered, selectedDateFilters);

    // Apply search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(booking =>
        booking.user_email?.toLowerCase().includes(query) ||
        booking.purpose?.toLowerCase().includes(query)
      );
    }

    setFilteredBookings(filtered);
  };

  const handleApproveBooking = async (bookingId: number) => {
    try {
      if (!confirm('Are you sure you want to approve this booking?')) {
        return;
      }

      await approveBooking(bookingId);
      const successMessage = `Booking approved successfully`;

      onStatusChange(successMessage);
      onDataChange(); // Refresh the bookings list
    } catch (error) {
      console.error('Error approving booking:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  const handleRejectBooking = async (bookingId: number) => {
    try {
      if (!confirm('Are you sure you want to reject this booking? This will automatically create a new timeslot at the same time.')) {
        return;
      }

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
      if (!confirm('Are you sure you want to cancel this approved booking?')) {
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
  const columns = [
    {
      key: 'user',
      header: (
        <Button
          variant="ghost"
          onClick={() => handleSort('user_email')}
        >
          User
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: (booking: BookingEntry) => (
        <TableCell>
          <div className="font-medium">{booking.user_email}</div>
          {booking.user_role && (
            <div className="text-xs text-gray-400">
              {booking.user_role.charAt(0).toUpperCase() + booking.user_role.slice(1)}
            </div>
          )}
        </TableCell>
      )
    },
    {
      key: 'date',
      header: (
        <Button
          variant="ghost"
          onClick={() => handleSort('booking_date')}
        >
          Date
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          {formatDate(booking.booking_date)}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'time',
      header: 'Time',
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center whitespace-nowrap">
          {formatTimeString(booking.start_time)} - {formatTimeString(booking.end_time)}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'purpose',
      header: 'Purpose',
      cell: (booking: BookingEntry) => (
        <TruncatedTextCell
          text={booking.purpose}
          maxLength={30}
          cellClassName="text-center"
        />
      ),
      className: 'text-center'
    },
    {
      key: 'status',
      header: 'Status',
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          <Badge className={getStatusColor(booking.status)}>
            {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
          </Badge>
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (booking: BookingEntry) => (
        <TableCell className="text-center">
          {(() => {
            switch (booking.status) {
              case 'pending':
                return (
                  <div className="flex justify-center space-x-2">
                    <Button
                      size="sm"
                      variant="default"
                      className="bg-green-700"
                      onClick={() => handleApproveBooking(booking.id)}
                    >
                      <Check />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      className="bg-red-600"
                      onClick={() => handleRejectBooking(booking.id)}
                    >
                      <X />
                      Reject
                    </Button>
                  </div>
                );
              case 'approved':
                return (
                  <Button
                    size="sm"
                    className="discard"
                    onClick={() => handleCancelBooking(booking.id)}
                  >
                    <CalendarX />
                    Cancel
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
          Manage booking requests and approvals.
        </p>
      </div>

      {/* Filter controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Label>Search</Label>
          <Input
            id="search-bookings"
            placeholder="Search by email or purpose..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <MultiSelectFilter
          label="Status"
          options={statusFilterOptions}
          selectedValues={selectedStatuses}
          onSelectionChange={setSelectedStatuses}
          variant="badge"
          placeholder="All Statuses"
        />

        <MultiSelectFilter
          label="Date"
          options={DATE_FILTER_OPTIONS}
          selectedValues={selectedDateFilters}
          onSelectionChange={setSelectedDateFilters}
          placeholder="All Dates"
        />
      </div>

      {/* Bookings Table */}
      {isLoading ? (
        <div className="text-center py-10">Loading bookings...</div>
      ) : (
        <div className="space-y-4">
          <PaginatedTable
            data={sortedData}
            columns={columns}
            initialRowsPerPage={10}
            rowsPerPageOptions={[5, 10, 25, 50]}
            emptyMessage="No bookings exist for this infrastructure."
            noResults={
              bookings.length > 0 ? (
                <div className="text-gray-400">
                  No bookings match your current filters.
                </div>
              ) : null
            }
          />
        </div>
      )}
    </div>
  );
};

export default BookingManagementTabsBookings;