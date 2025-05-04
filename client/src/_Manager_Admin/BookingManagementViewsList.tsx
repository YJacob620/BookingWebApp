import { useState } from 'react';
import { TableCell } from "@/components/ui/table";
import {
  Clock,
  Calendar,
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
} from '@/utils';
import TruncatedTextCell from '@/components/_TruncatedTextCell';
import PaginatedTable, { PaginatedTableColumn } from '@/components/_PaginatedTable';
import { useTranslation } from 'react-i18next';

const BookingManagementViewsList = ({ bookingEntries }: { bookingEntries: BookingEntry[] }) => {
  // Set default sorting to date in descending order
  const [sortConfig, setSortConfig] = useState<SortConfig<BookingEntry>>({ key: 'booking_date', direction: 'desc' });
  const { t,i18n } = useTranslation();

  // Handle sort change from PaginatedTable
  const handleSortChange = (newSortConfig: SortConfig<BookingEntry>) => {
    setSortConfig(newSortConfig);
  };

  // Define columns for PaginatedTable
  const columns: PaginatedTableColumn<BookingEntry>[] = [
    {
      key: 'booking_type',
      header: t('Type'),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          {item.booking_type === 'timeslot' ? (
            <Badge className="bg-blue-700">
              <Calendar className="h-3 w-3 mr-1" />
              {t('Timeslot')}
            </Badge>
          ) : (
            <Badge className="bg-purple-700">
              <Clock className="h-3 w-3 mr-1" />
              {t('Booking')}
            </Badge>
          )}
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'booking_date',
      header: t('Date'),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          {formatDate(item.booking_date)}
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'start_time',
      header: t('Time'),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center whitespace-nowrap">
          {formatTimeString(item.start_time)} - {formatTimeString(item.end_time)}
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'duration',
      header: t('Duration'),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center" dir={i18n.dir()}>
          {calculateDuration(item.start_time, item.end_time)} {t('minutesShort')}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'status',
      header: t('Status'),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          <Badge className={getStatusColor(item.status)}>
            {t(formatStatus(item.booking_type, item.status))}
          </Badge>
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'user_email',
      header: t('User'),
      cell: (item: BookingEntry) => (
        <TableCell className="text-center">
          {item.user_email || 'N/A'}
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'purpose',
      header: t('Purpose'),
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
        data={bookingEntries}
        columns={columns}
        initialRowsPerPage={10}
        rowsPerPageOptions={[5, 10, 25, 50]}
        emptyMessage={t('bookingManagementViewsList.noBookingsOrTimeslots')}
        sortConfig={sortConfig}
        onSortChange={handleSortChange}
        noResults={
          <div className="text-gray-400">
            {t('bookingManagementViewsList.noBookingsOrTimeslotsMatchFilter')}
          </div>
        }
      />
    </div>
  );
};

export default BookingManagementViewsList;