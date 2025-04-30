import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell } from "@/components/ui/table";
import {
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

import {
  formatDate,
  formatTimeString,
  getStatusColor,
  calculateDuration,
  cancelTimeslots,
  Infrastructure,
  BookingEntry,
  applyDateFilters,
  applyStatusFilters,
  createFilterOptions,
  DATE_FILTER_OPTIONS,
  TIMESLOT_STATUSES,
  TimeslotStatus
} from '@/utils';
import { FilterSortState } from './BookingManagement';
import MultiSelectFilter from '@/components/_MultiSelectFilter';
import PaginatedTable, { PaginatedTableColumn } from '@/components/_PaginatedTable';
import { useTranslation } from 'react-i18next';

interface TimeslotListProps {
  selectedInfrastructure: Infrastructure | undefined;
  items: BookingEntry[];
  onDelete: (message: string) => void;
  onError: (message: string) => void;
  onDataChange: () => void;
  filterState: FilterSortState;
  onFilterStateChange: (newState: Partial<FilterSortState>) => void;
}

const BookingManagementTabsTimeslots: React.FC<TimeslotListProps> = ({
  selectedInfrastructure,
  items,
  onDelete,
  onError,
  onDataChange,
  filterState,
  onFilterStateChange
}) => {
  // Main state
  const [timeslots, setTimeslots] = useState<BookingEntry[]>([]);
  const [filteredTimeslots, setFilteredTimeslots] = useState<BookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { t } = useTranslation();

  // Get relevant states from filterState
  const {
    selectedTimeslotStatusFilters,
    selectedTimeslotDateFilters,
    timeslotDayFilter,
    timeslotsSortConfig,
    selectedTimeslots
  } = filterState;

  // Load timeslots when infrastructure changes
  useEffect(() => {
    if (selectedInfrastructure) {
      setTimeslots(items);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [selectedInfrastructure, items]);

  // Filtered timeslots based on filters
  useEffect(() => {
    let filtered = [...timeslots];

    // Apply status filters using utility function
    filtered = applyStatusFilters(filtered, selectedTimeslotStatusFilters);

    // Apply date filters using utility function
    filtered = applyDateFilters(filtered, selectedTimeslotDateFilters);

    // Apply custom date filter if set
    if (timeslotDayFilter) {
      filtered = filtered.filter(slot => {
        const slotDate = new Date(slot.booking_date);
        const filterDate = new Date(timeslotDayFilter);

        return (
          slotDate.getFullYear() === filterDate.getFullYear() &&
          slotDate.getMonth() === filterDate.getMonth() &&
          slotDate.getDate() === filterDate.getDate()
        );
      });
    }

    setFilteredTimeslots(filtered);
  }, [timeslots, selectedTimeslotStatusFilters, selectedTimeslotDateFilters, timeslotDayFilter]);

  // Clear custom date filter and update date filters
  const handleClearDateFilter = () => {
    onFilterStateChange({ timeslotDayFilter: '' });
  };

  const handleDateFilterChange = (date: string) => {
    // Clear predefined date filters if custom date is set
    if (date) {
      onFilterStateChange({
        selectedTimeslotDateFilters: [],
        timeslotDayFilter: date
      });
    } else {
      onFilterStateChange({ timeslotDayFilter: date });
    }
  };

  const handleDeleteTimeslots = async (ids: number[]) => {
    if (ids.length === 0) return;

    try {
      // Use the imported API function instead of direct fetch
      await cancelTimeslots(ids);

      onDelete(`Successfully canceled ${ids.length} timeslot(s)`);

      // Remove deleted items from selection
      onFilterStateChange({
        selectedTimeslots: selectedTimeslots.filter(id => !ids.includes(id))
      });

      // Refresh the data
      onDataChange();
    } catch (error) {
      console.error('Error canceling timeslots:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Define columns for PaginatedTable
  const columns: PaginatedTableColumn<BookingEntry>[] = [
    {
      key: 'select',
      header: 'Select',
      cell: (booking: BookingEntry) => (
        <TableCell>
          <div className="pr-2">
            <Checkbox
              checked={selectedTimeslots.includes(booking.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onFilterStateChange({
                    selectedTimeslots: [...selectedTimeslots, booking.id]
                  });
                } else {
                  onFilterStateChange({
                    selectedTimeslots: selectedTimeslots.filter(id => id !== booking.id)
                  });
                }
              }}
              disabled={booking.status !== 'available'}
              className="checkbox1 h-5 w-5"
            />
          </div>
        </TableCell>
      ),
      className: 'text-center w-14'
    },
    {
      key: 'booking_date',
      header: 'Date',
      cell: (booking: BookingEntry) => (
        <TableCell>
          {formatDate(booking.booking_date)}
        </TableCell>
      ),
      sortable: true,
      defaultSort: 'desc'
    },
    {
      key: 'start_time',
      header: 'Start Time',
      cell: (slot: BookingEntry) => (
        <TableCell>
          {formatTimeString(slot.start_time)}
        </TableCell>
      ),
    },
    {
      key: 'end_time',
      header: 'End Time',
      cell: (slot: BookingEntry) => (
        <TableCell>
          {formatTimeString(slot.end_time)}
        </TableCell>
      ),
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (slot: BookingEntry) => (
        <TableCell>
          <div className="flex items-center justify-center gap-2">
            {calculateDuration(slot.start_time, slot.end_time)} minutes
          </div>
        </TableCell>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (slot: BookingEntry) => (
        <TableCell>
          <Badge className={getStatusColor(slot.status)}>
            {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
          </Badge>
        </TableCell>
      ),
      sortable: true
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          {slot.status == 'available' && (
            <Button
              variant="custom2"
              className="px-2 py-1 discard"
              onClick={() => {
                if (window.confirm('Are you sure you want to cancel this timeslot?')) {
                  handleDeleteTimeslots([slot.id]);
                }
              }}
            >
              Cancel
            </Button>
          )}
        </TableCell>
      ),
      className: 'text-center'
    }
  ];

  return (
     <div className="space-y-4">
      {/* Description section */}
      <div className="flex-row justify-center">
        <p className="explanation-text1">
          {t('bookingManagementTabsTimeslots.description')}
        </p>
        <div className="flex-row">
          <Button
            variant={"custom2"}
            onClick={() => {
              if (window.confirm(t('bookingManagementTabsTimeslots.confirmCancelSelectedTimeslots', { count: selectedTimeslots.length }))) {
                handleDeleteTimeslots(selectedTimeslots);
              }
            }}
            className="px-2 h-10 discard text-md mt-4"
            disabled={selectedTimeslots.length == 0}
          >
            <Trash2 className="h-4 w-4" />
            {t('bookingManagementTabsTimeslots.cancelSelected', { count: selectedTimeslots.length })}
          </Button>
        </div>
      </div>


      {/* Filter controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <p>Filter by Date</p>
          <div className="flex space-x-2">
            <Input
              id="date-filter-input"
              type="date"
              value={timeslotDayFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              disabled={selectedTimeslotDateFilters.length > 0}
              className='h-10'
            />
            {timeslotDayFilter && (
              <Button
                variant="custom5"
                onClick={handleClearDateFilter}
                className="p-2"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <MultiSelectFilter
          label="Filter by Status"
          options={createFilterOptions(TIMESLOT_STATUSES, getStatusColor)}
          selectedValues={selectedTimeslotStatusFilters}
          onSelectionChange={(values) =>
            onFilterStateChange({ selectedTimeslotStatusFilters: values as TimeslotStatus[] })}
          variant="badge"
          placeholder="All Statuses"
        />

        <MultiSelectFilter
          label="Filter by Time-Period"
          options={createFilterOptions(DATE_FILTER_OPTIONS)}
          selectedValues={selectedTimeslotDateFilters}
          onSelectionChange={(values) =>
            onFilterStateChange({ selectedTimeslotDateFilters: values })}
          placeholder="All Times"
          disabled={!!timeslotDayFilter}
          triggerClassName={timeslotDayFilter ? 'opacity-50' : ''}
        />
      </div>

      {/* Timeslots Table */}
      {isLoading ? (
        <div className="text-center py-10">{t('common.LoadingTimeslots')}</div>
      ) : (
        <PaginatedTable
          data={filteredTimeslots}
          columns={columns}
          initialRowsPerPage={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          emptyMessage={t('bookingManagementTabsTimeslots.noTimeslotsMessage')}
          sortConfig={timeslotsSortConfig}
          onSortChange={(newSortConfig) => onFilterStateChange({ timeslotsSortConfig: newSortConfig })}
          noResults={
            timeslots.length > 0 ? (
              <div className="text-gray-400">
                 {t('bookingManagementTabsTimeslots.noTimeslotsMatchFilter')}
              </div>
            ) : null
          }
        />
      )}
    </div>
  );
};

export default BookingManagementTabsTimeslots;