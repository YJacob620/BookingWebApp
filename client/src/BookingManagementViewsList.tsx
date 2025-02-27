import React from 'react';
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
  Calendar
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { formatDate, formatTimeString } from '@/utils';
import { CalendarItem } from '@/types';


interface BookingsListViewProps {
  items: CalendarItem[];
  onStatusChange: () => void;
  onError: (message: string) => void;
}

const BookingManagementViewsList: React.FC<BookingsListViewProps> = ({
  items,
  onStatusChange,
  onError
}) => {

  // Get color for status badge
  const getStatusColor = (type: string, status: string): string => {
    if (type === 'timeslot') return 'bg-blue-700 text-blue-100';

    switch (status) {
      case 'pending': return 'bg-yellow-700 text-yellow-100';
      case 'approved': return 'bg-green-700 text-green-100';
      case 'rejected': return 'bg-red-700 text-red-100';
      case 'completed': return 'bg-blue-700 text-blue-100';
      case 'expired': return 'bg-gray-700 text-gray-100';
      case 'canceled': return 'bg-purple-700 text-purple-100';
      default: return 'bg-gray-700 text-gray-100';
    }
  };

  // Format status for display
  const formatStatus = (type: string, status: string): string => {
    if (type === 'timeslot') return 'Available';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Calculate duration in minutes
  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / 60000;
  };

  return (
    <div className="">
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-700">
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-center">Date</TableHead>
              <TableHead className="text-center">Time</TableHead>
              <TableHead className="text-center">Duration</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">User</TableHead>
              <TableHead className="text-center">Purpose</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((item) => (
                <TableRow
                  key={`${item.type}-${item.id}`}
                  className="border-gray-700 def-hover"
                >
                  <TableCell className="text-center">
                    {item.type === 'timeslot' ? (
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
                    {formatDate(item.date)}
                  </TableCell>
                  <TableCell className="text-center whitespace-nowrap">
                    {formatTimeString(item.start_time)} - {formatTimeString(item.end_time)}
                  </TableCell>
                  <TableCell className="text-center">
                    {calculateDuration(item.start_time, item.end_time)} min
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={getStatusColor(item.type, item.status)}>
                      {formatStatus(item.type, item.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    {item.user_email || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-xs overflow-hidden text-ellipsis">
                      {item.purpose || 'N/A'}
                    </div>
                  </TableCell>
                </TableRow>
              ))
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