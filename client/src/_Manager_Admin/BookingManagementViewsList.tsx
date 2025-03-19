import React, { useState } from 'react';
import { TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Calendar,
  ArrowUpDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import {
  formatDate,
  formatTimeString,
  getStatusColor,
  calculateDuration,
  formatStatus,
  BookingEntry,
  SortConfig
} from '@/_utils';
import TruncatedTextCell from '@/components/_TruncatedTextCell';
import PaginatedTable from '@/components/_PaginatedTable';

interface BookingsListViewProps {
  items: BookingEntry[];
}

const BookingManagementViewsList: React.FC<BookingsListViewProps> = ({
  items
}) => {
  // Set default sorting to date in descending order
  const [sortConfig, setSortConfig] = useState<SortConfig<BookingEntry>>({ key: 'booking_date', direction: 'desc' });

  // Handle sorting
  const handleSort = (key: keyof BookingEntry) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Define columns for PaginatedTable
  const columns = [
    {
      key: 'type',
      header: (
        <Button
          variant="ghost"
          onClick={() => handleSort('booking_type')}
        >
          Type
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          {item.booking_type === 'timeslot' ? (
            <Badge className="bg-blue-700">
              <Calendar className="h-3 w-3 mr-1" />
              Timeslot
            </Badge>
          ) : (
            <Badge className="bg-purple-700">
              <Clock className="h-3 w-3 mr-1" />
              Booking
            </Badge>
          )}
        </TableCell>
      ),
      className: 'text-center'
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
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          {formatDate(item.booking_date)}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'time',
      header: 'Time',
      cell: (item: BookingEntry) => (
        <TableCell className="text-center whitespace-nowrap">
          {formatTimeString(item.start_time)} - {formatTimeString(item.end_time)}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          {calculateDuration(item.start_time, item.end_time)} min
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'status',
      header: (
        <Button
          variant="ghost"
          onClick={() => handleSort('status')}
        >
          Status
          <ArrowUpDown className="ml-1 h-4 w-4" />
        </Button>
      ),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          <Badge className={getStatusColor(item.status)}>
            {formatStatus(item.booking_type, item.status)}
          </Badge>
        </TableCell>
      ),
      className: 'text-center'
    },
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
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          {item.user_email || 'N/A'}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'purpose',
      header: 'Purpose',
      cell: (item: BookingEntry) => (
        <TruncatedTextCell
          text={item.purpose}
          maxLength={30}
          cellClassName="text-center"
        />
      ),
      className: 'text-center'
    }
  ];

  return (
    <div>
      <PaginatedTable
        data={items}
        columns={columns}
        initialRowsPerPage={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage="No bookings or timeslots available."
        sortConfig={sortConfig}
        noResults={
          <div className="text-gray-400">
            No bookings or timeslots match your current filter.
          </div>
        }
      />
    </div>
  );
};

export default BookingManagementViewsList;