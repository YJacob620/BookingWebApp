import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell } from "@/components/ui/table";
import {
  MoreHorizontal,
  Trash2,
  ArrowUpDown,
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

import {
  formatDate,
  formatTimeString,
  getStatusColor,
  calculateDuration,
  getTimeslotStatusOptions,
  cancelTimeslots,
  Infrastructure,
  BookingEntry,
  SortConfig
} from '@/_utils';
import PaginatedTable from '@/components/_PaginatedTable';

interface TimeslotListProps {
  selectedInfrastructure: Infrastructure | undefined;
  items: BookingEntry[];
  onDelete: (message: string) => void;
  onError: (message: string) => void;
  onDataChange: () => void;
}

const BookingManagementTabsTimeslots: React.FC<TimeslotListProps> = ({
  selectedInfrastructure,
  items,
  onDelete,
  onError,
  onDataChange
}) => {
  // Main state
  const [timeslots, setTimeslots] = useState<BookingEntry[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sortConfig, setSortConfig] = useState<SortConfig<BookingEntry>>({ key: 'booking_date', direction: 'desc' });

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
  const filteredTimeslots = useMemo(() => {
    let filtered = [...timeslots];

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(slot => slot.status === statusFilter);
    }

    // Apply date filter
    if (dateFilter) {
      // Compare year, month, and day directly for specific date
      filtered = filtered.filter(slot => {
        const slotDate = new Date(slot.booking_date);
        const filterDate = new Date(dateFilter);

        return (
          slotDate.getFullYear() === filterDate.getFullYear() &&
          slotDate.getMonth() === filterDate.getMonth() &&
          slotDate.getDate() === filterDate.getDate()
        );
      });
    } else if (filterType !== 'all') {
      // Apply period filter (today, upcoming, past)
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Start of today

      if (filterType === 'today') {
        const today = now.toDateString(); // Convert to a comparable string format
        filtered = filtered.filter(slot => new Date(slot.booking_date).toDateString() === today);
      } else if (filterType === 'upcoming') {
        filtered = filtered.filter(slot => {
          const slotDate = new Date(slot.booking_date);
          return slotDate >= now;
        });
      } else if (filterType === 'past') {
        filtered = filtered.filter(slot => {
          const slotDate = new Date(slot.booking_date);
          return slotDate < now;
        });
      }
    }

    return filtered;
  }, [timeslots, statusFilter, dateFilter, filterType]);

  // Sorted data based on sort config
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredTimeslots;

    return [...filteredTimeslots].sort((a, b) => {
      if (sortConfig.key === 'booking_date') {
        const dateA = new Date(a.booking_date);
        const dateB = new Date(b.booking_date);

        // First compare dates
        const dateCompare = sortConfig.direction === 'desc'
          ? dateB.getTime() - dateA.getTime()
          : dateA.getTime() - dateB.getTime();

        // If dates are equal, sort by start_time
        if (dateCompare === 0) {
          return sortConfig.direction === 'asc'
            ? a.start_time.localeCompare(b.start_time)
            : b.start_time.localeCompare(a.start_time);
        }

        return dateCompare;
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
  }, [filteredTimeslots, sortConfig]);

  // Handle sorting
  const handleSort = (key: keyof BookingEntry) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Clear selected slots when filtered timeslots change
  useEffect(() => {
    // Only keep selected slots that are still in the filtered list
    setSelectedSlots(prev =>
      prev.filter(id => filteredTimeslots.some(slot => slot.id === id))
    );
  }, [filteredTimeslots]);

  const handleDeleteTimeslots = async (ids: number[]) => {
    if (ids.length === 0) return;

    try {
      // Use the imported API function instead of direct fetch
      await cancelTimeslots(ids);

      onDelete(`Successfully canceled ${ids.length} timeslot(s)`);

      // Remove deleted items from selection
      setSelectedSlots(prev => prev.filter(id => !ids.includes(id)));

      // Refresh the data
      onDataChange();
    } catch (error) {
      console.error('Error canceling timeslots:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Define columns for PaginatedTable
  const columns = [
    {
      key: 'select',
      header: 'Select',
      cell: (slot: BookingEntry) => (
        <TableCell>
          <div className="pr-2">
            <Checkbox
              checked={selectedSlots.includes(slot.id)}
              onCheckedChange={(checked) => {
                if (checked) {
                  setSelectedSlots(prev => [...prev, slot.id]);
                } else {
                  setSelectedSlots(prev => prev.filter(id => id !== slot.id));
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
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          {formatDate(slot.booking_date)}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'start_time',
      header: 'Start Time',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          {formatTimeString(slot.start_time)}
        </TableCell>
      ),
      className: 'text-center'
    },
    {
      key: 'end_time',
      header: 'End Time',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          {formatTimeString(slot.end_time)}
        </TableCell>
      ),
      className: 'text-center'
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
      className: 'text-center'
    },
    {
      key: 'actions',
      header: 'Actions',
      cell: (slot: BookingEntry) => (
        <TableCell className="text-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild className="bg-slate-950">
              <Button
                variant="ghost"
                className="h-6 w-8 p-0 mx-auto"
                disabled={slot.status !== 'available'}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  if (window.confirm('Are you sure you want to cancel this timeslot?')) {
                    handleDeleteTimeslots([slot.id]);
                  }
                }}
                className="def-hover text-red-500"
              >
                Cancel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      ),
      className: 'text-center'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Description section - without update button */}
      <div className="mb-4 flex justify-center items-center">
        <p className="explanation-text1">
          View and manage timeslots for this infrastructure.
        </p>
        {selectedSlots.length > 0 && (
          <Button
            onClick={() => {
              if (window.confirm(`Are you sure you want to cancel ${selectedSlots.length} selected timeslot(s)?`)) {
                handleDeleteTimeslots(selectedSlots);
              }
            }}
            className="h-8 discard"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Cancel Selected ({selectedSlots.length})
          </Button>
        )}
      </div>

      {/* Filter controls - similar layout to BookingManagementTabsBookings */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex flex-col space-y-2 flex-grow">
          <Label htmlFor="date-filter-input">Filter by Date</Label>
          <Input
            id="date-filter-input"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
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
              {/* Use shared utility to get status options */}
              {getTimeslotStatusOptions().map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-2">
          <Label htmlFor="period-filter">Period</Label>
          <Select
            value={filterType}
            onValueChange={setFilterType}
          >
            <SelectTrigger id="period-filter" className="w-[180px]">
              <SelectValue placeholder="Select Period" />
            </SelectTrigger>
            <SelectContent className="card1">
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {dateFilter && (
          <div className="flex flex-col justify-end space-y-2">
            <Label className="opacity-0">Clear</Label>
            <Button
              variant="outline"
              onClick={() => setDateFilter('')}
              className="h-10"
            >
              Clear Date Filter
            </Button>
          </div>
        )}
      </div>

      {/* Timeslots Table */}
      {isLoading ? (
        <div className="text-center py-10">Loading timeslots...</div>
      ) : (
        <PaginatedTable
          data={sortedData}
          columns={columns}
          initialRowsPerPage={10}
          rowsPerPageOptions={[5, 10, 25, 50]}
          emptyMessage="No timeslots for this infrastructure."
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