import React, { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  Calendar,
  ArrowUpDown
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import {
  formatDate,
  formatTimeString,
  getStatusColor,
  calculateDuration,
  formatStatus,
  BookingEntry
} from '@/_utils';
import TruncatedTextCell from '@/components/ui/_TruncatedTextCell';

interface BookingsListViewProps {
  items: BookingEntry[];
}

interface SortConfig {
  key: keyof BookingEntry | null;
  direction: 'asc' | 'desc';
}

const BookingManagementViewsList: React.FC<BookingsListViewProps> = ({
  items
}) => {
  // Set default sorting to date in descending order
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'booking_date', direction: 'desc' });

  // Handle sorting
  const handleSort = (key: keyof BookingEntry) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Apply sorting to items
  const sortedItems = useMemo(() => {
    let sorted = [...items];

    if (sortConfig.key) {
      sorted.sort((a, b) => {
        // Sort by date
        if (sortConfig.key === 'booking_date') {
          const dateA = new Date(a.booking_date);
          const dateB = new Date(b.booking_date);

          // If dates are equal, sort by start_time
          if (dateA.getTime() === dateB.getTime()) {
            const timeA = a.start_time;
            const timeB = b.start_time;
            return sortConfig.direction === 'asc'
              ? timeA.localeCompare(timeB)
              : timeB.localeCompare(timeA);
          }

          return sortConfig.direction === 'desc'
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        }

        // Sort by user
        if (sortConfig.key === 'user_email') {
          const valA = a[sortConfig.key] || '';
          const valB = b[sortConfig.key] || '';

          return sortConfig.direction === 'asc'
            ? valA.localeCompare(valB)
            : valB.localeCompare(valA);
        }

        // Sort by booking type
        if (sortConfig.key === 'booking_type') {
          return sortConfig.direction === 'asc'
            ? a.booking_type.localeCompare(b.booking_type)
            : b.booking_type.localeCompare(a.booking_type);
        }

        // Sort by status
        if (sortConfig.key === 'status') {
          return sortConfig.direction === 'asc'
            ? a.status.localeCompare(b.status)
            : b.status.localeCompare(a.status);
        }

        // Default sorting for other columns
        // Type guard to ensure key is not null before accessing
        if (!sortConfig.key) return 0;

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
  }, [items, sortConfig]);

  return (
    <div>
      <div className="table-wrapper">
        <Table>
          <TableHeader className="">
            <TableRow>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('booking_type')}
                >
                  Type
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('booking_date')}
                >
                  Date
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('status')}
                >
                  Status
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  onClick={() => handleSort('user_email')}
                >
                  User
                  <ArrowUpDown className="ml-1 h-4 w-4" />
                </Button>
              </TableHead>
              <TableHead>Purpose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.length > 0 ? (
              sortedItems.map((item) => {
                // Generate a unique key for this row
                const rowKey = `${item.booking_type}-${item.id}`;

                return (
                  <TableRow
                    key={rowKey}
                    className="border-gray-700 def-hover"
                  >
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
                    <TableCell className="text-center">
                      {formatDate(item.booking_date)}
                    </TableCell>
                    <TableCell className="text-center whitespace-nowrap">
                      {formatTimeString(item.start_time)} - {formatTimeString(item.end_time)}
                    </TableCell>
                    <TableCell className="text-center">
                      {calculateDuration(item.start_time, item.end_time)} min
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className={getStatusColor(item.status)}>
                        {formatStatus(item.booking_type, item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.user_email || 'N/A'}
                    </TableCell>
                    <TruncatedTextCell
                      text={item.purpose}
                      maxLength={30}
                      cellClassName="text-center"
                    />
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  <div className="text-gray-400">
                    No bookings or timeslots match your current filter.
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default BookingManagementViewsList;