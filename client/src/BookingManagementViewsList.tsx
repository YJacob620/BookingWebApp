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

import {
  formatDate,
  formatTimeString,
  getStatusColor,
  calculateDuration,
  formatStatus
} from '@/utils';
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
                    <Badge className={getStatusColor(item.status)}>
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