import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  BOOKING_STATUSES,
  DATE_FILTER_OPTIONS
} from '@/_utils';
import { FilterState } from './BookingManagement';
import MultiSelectFilter from '@/components/_MultiSelectFilter';
import PaginatedTable, { PaginatedTableColumn } from '@/components/_PaginatedTable';

interface TimeslotListProps {
  selectedInfrastructure: Infrastructure | undefined;
  items: BookingEntry[];
  onDelete: (message: string) => void;
  onError: (message: string) => void;
  onDataChange: () => void;
  filterState: FilterState;
  onFilterStateChange: (newState: Partial<FilterState>) => void;
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
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [selectedDateFilters, setSelectedDateFilters] = useState<string[]>([]);
  // Get relevant states from filterState
  const {
    // selectedStatuses,
    // selectedDateFilters,
    bookingsDayFilter: customDateFilter,
    bookingsSortConfig: sortConfig,
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
    filtered = applyStatusFilters(filtered, selectedStatuses);

    // Apply date filters using utility function
    filtered = applyDateFilters(filtered, selectedDateFilters);

    // Apply custom date filter if set
    if (customDateFilter) {
      filtered = filtered.filter(slot => {
        const slotDate = new Date(slot.booking_date);
        const filterDate = new Date(customDateFilter);

        return (
          slotDate.getFullYear() === filterDate.getFullYear() &&
          slotDate.getMonth() === filterDate.getMonth() &&
          slotDate.getDate() === filterDate.getDate()
        );
      });
    }

    setFilteredTimeslots(filtered);
  }, [timeslots, selectedStatuses, selectedDateFilters, customDateFilter]);

  // Clear custom date filter and update date filters
  const handleClearDateFilter = () => {
    onFilterStateChange({ bookingsDayFilter: '' });
  };

  const handleDateFilterChange = (date: string) => {
    // Clear predefined date filters if custom date is set
    if (date) {
      onFilterStateChange({
        selectedBookingDateFilters: [],
        bookingsDayFilter: date
      });
    } else {
      onFilterStateChange({ bookingsDayFilter: date });
    }
  };

  // Handle predefined date filter changes
  const handlePredefinedDateFiltersChange = (values: string[]) => {
    // Clear custom date filter if predefined filters are selected
    if (values.length > 0) {
      onFilterStateChange({
        bookingsDayFilter: '',
        selectedBookingDateFilters: values
      });
    } else {
      onFilterStateChange({ selectedBookingDateFilters: values });
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
      cell: (slot: BookingEntry) => (
        <TableCell>
          <div className="pr-2">
            <Checkbox
              checked={selectedTimeslots.includes(slot.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  onFilterStateChange({
                    selectedTimeslots: [...selectedTimeslots, slot.id]
                  });
                } else {
                  onFilterStateChange({
                    selectedTimeslots: selectedTimeslots.filter(id => id !== slot.id)
                  });
                }
              }}
              disabled={slot.status !== 'available'}
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
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          {formatDate(slot.booking_date)}
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'start_time',
      header: 'Start Time',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          {formatTimeString(slot.start_time)}
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'end_time',
      header: 'End Time',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          {formatTimeString(slot.end_time)}
        </TableCell>
      ),
      className: 'text-center',
      sortable: true
    },
    {
      key: 'duration',
      header: 'Duration',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-2">
            {calculateDuration(slot.start_time, slot.end_time)} minutes
          </div>
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'status',
      header: 'Status',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          <Badge className={getStatusColor(slot.status)}>
            {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
          </Badge>
        </TableCell>
      ),
      className: 'text-center',
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
          View and manage timeslots for this infrastructure.
        </p>
        <div className="flex-row">
          <Button
            variant={"custom2"}
            onClick={() => {
              if (window.confirm(`Are you sure you want to cancel ${selectedTimeslots.length} selected timeslot(s)?`)) {
                handleDeleteTimeslots(selectedTimeslots);
              }
            }}
            className="px-2 h-10 discard text-md mt-4"
            disabled={selectedTimeslots.length == 0}
          >
            <Trash2 className="h-4 w-4" />
            Cancel Selected ({selectedTimeslots.length})
          </Button>
        </div>
      </div>

      {/* Filter controls - updated with MultiSelectFilter */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <Label>Filter by Specific Date</Label>
          <div className="flex space-x-2">
            <Input
              id="date-filter-input"
              type="date"
              value={customDateFilter}
              onChange={(e) => handleDateFilterChange(e.target.value)}
              className={`${selectedDateFilters.length > 0 ? 'opacity-50' : ''}`}
              disabled={selectedDateFilters.length > 0}
            />
            {customDateFilter && (
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

        {/* <MultiSelectFilter
          label="Status"
          options={statusFilterOptions}
          selectedValues={selectedStatuses}
          onSelectionChange={(values) => onFilterStateChange({ selectedStatuses: values })}
          variant="badge"
          placeholder="All Statuses"
        />

        <MultiSelectFilter
          label="Date Range"
          options={DATE_FILTER_OPTIONS}
          selectedValues={selectedDateFilters}
          onSelectionChange={handlePredefinedDateFiltersChange}
          placeholder="All Dates"
          disabled={!!customDateFilter}
          triggerClassName={customDateFilter ? 'opacity-50' : ''}
        /> */}
        <MultiSelectFilter
          label="Status"
          options={createFilterOptions(BOOKING_STATUSES, getStatusColor)}
          selectedValues={selectedStatuses}
          onSelectionChange={setSelectedStatuses}
          variant="badge"
          placeholder="All Statuses"
        />

        {/* Date filter using MultiSelectFilter */}
        <MultiSelectFilter
          label="Date"
          options={createFilterOptions(DATE_FILTER_OPTIONS)}
          selectedValues={selectedDateFilters}
          onSelectionChange={setSelectedDateFilters}
          placeholder="All Dates"
        />
      </div>

      {/* Timeslots Table */}
      {isLoading ? (
        <div className="text-center py-10">Loading timeslots...</div>
      ) : (
        <PaginatedTable
          data={filteredTimeslots}
          columns={columns}
          initialRowsPerPage={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          emptyMessage="No timeslots for this infrastructure."
          sortConfig={sortConfig}
          onSortChange={(newSortConfig) => onFilterStateChange({ bookingsSortConfig: newSortConfig })}
          noResults={
            timeslots.length > 0 ? (
              <div className="text-gray-400">
                No timeslots match your current filters.
              </div>
            ) : null
          }
        />
      )}
    </div>
  );
};

export default BookingManagementTabsTimeslots;