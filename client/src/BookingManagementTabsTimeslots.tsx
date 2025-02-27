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
  Trash2,
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

import { formatDate, formatTimeString } from '@/utils';
import { Infrastructure, Timeslot } from '@/types';

interface TimeslotListProps {
  infrastructureId: number;
  selectedInfrastructure: Infrastructure | undefined;
  onDelete: (message: string) => void;
  onError: (message: string) => void;
}

const BookingManagementTabsTimeslots: React.FC<TimeslotListProps> = ({
  infrastructureId,
  selectedInfrastructure,
  onDelete,
  onError
}) => {
  // Main state
  const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('upcoming');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filtered timeslots based on filters
  const filteredTimeslots = React.useMemo(() => {
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
        const today = now.toISOString().split('T')[0];
        filtered = filtered.filter(slot => slot.booking_date === today);
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

  // Load timeslots when infrastructure changes
  useEffect(() => {
    if (infrastructureId) {
      fetchTimeslots();
    } else {
      setTimeslots([]);
    }
  }, [infrastructureId]);

  // Clear selected slots when filtered timeslots change
  useEffect(() => {
    // Only keep selected slots that are still in the filtered list
    setSelectedSlots(prev =>
      prev.filter(id => filteredTimeslots.some(slot => slot.id === id))
    );
  }, [filteredTimeslots]);

  const fetchTimeslots = async () => {
    if (!infrastructureId) return;

    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      // New endpoint to fetch all timeslots instead of just available ones
      const url = `http://localhost:3001/api/bookings/timeslots/${infrastructureId}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      setTimeslots(data);
    } catch (error) {
      console.error('Error fetching timeslots:', error);
      onError('Error loading timeslots. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTimeslots = async (ids: number[]) => {
    if (ids.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:3001/api/bookings/timeslots', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ids })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to cancel timeslots');
      }

      onDelete(`Successfully canceled ${ids.length} timeslot(s)`);

      // Remove deleted items from selection
      setSelectedSlots(prev => prev.filter(id => !ids.includes(id)));

      // Refresh the data
      fetchTimeslots();
    } catch (error) {
      console.error('Error canceling timeslots:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    }
  };

  // Calculate duration in minutes between start and end time
  const calculateDuration = (startTime: string, endTime: string): number => {
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    return (end.getTime() - start.getTime()) / 60000;
  };

  // Check if duration exceeds max booking duration
  const isOverMaxDuration = (duration: number): boolean => {
    return !!selectedInfrastructure?.max_booking_duration &&
      duration > selectedInfrastructure.max_booking_duration;
  };

  // Get color for status badge
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'available':
        return 'bg-blue-700 text-blue-100';
      case 'canceled':
        return 'bg-purple-700 text-purple-100';
      case 'expired':
        return 'bg-gray-700 text-gray-100';
      default:
        return 'bg-gray-700 text-gray-100';
    }
  };

  return (
    <div className="space-y-4">
      {/* Description section - without update button */}
      <div className="mb-4 flex justify-between items-center">
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
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="canceled">Canceled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
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
        <div className="rounded-md border border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-center w-14">Select</TableHead>
                <TableHead className="text-center">Date</TableHead>
                <TableHead className="text-center">Start Time</TableHead>
                <TableHead className="text-center">End Time</TableHead>
                <TableHead className="text-center">Duration</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTimeslots.length > 0 ? (
                filteredTimeslots.map((slot) => {
                  const duration = calculateDuration(slot.start_time, slot.end_time);
                  const isExceedingMaxDuration = isOverMaxDuration(duration);

                  return (
                    <TableRow
                      key={slot.id}
                      className="border-gray-700 def-hover"
                    >
                      <TableCell className="text-center">
                        <input
                          type="checkbox"
                          className="checkbox1 mx-auto"
                          checked={selectedSlots.includes(slot.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSlots(prev => [...prev, slot.id]);
                            } else {
                              setSelectedSlots(prev => prev.filter(id => id !== slot.id));
                            }
                          }}
                          disabled={slot.status !== 'available'}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDate(slot.booking_date)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatTimeString(slot.start_time)}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatTimeString(slot.end_time)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          {duration} minutes
                          {isExceedingMaxDuration && (
                            <Badge variant="destructive" className="text-xs">
                              Exceeds max
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusColor(slot.status)}>
                          {slot.status.charAt(0).toUpperCase() + slot.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 mx-auto"
                              disabled={slot.status !== 'available'}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="card1">
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
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="text-gray-400">
                      {timeslots.length > 0
                        ? `No timeslots match your current filters.`
                        : 'No timeslots for this infrastructure.'
                      }
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

export default BookingManagementTabsTimeslots;