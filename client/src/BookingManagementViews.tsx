import React, { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar, List } from "lucide-react";

import BookingManagementViewsCalendar from './BookingManagementViewsCalendar';
import BookingManagementViewsList from './BookingManagementViewsList';

import {
  Infrastructure,
  CalendarItem,
  getInfrastAvailTimeslots,
  getInfrastructureBookings
} from '@/utils';


interface CalendarListViewProps {
  infrastructureId: number;
  selectedInfrastructure: Infrastructure | undefined;
  refreshTrigger: number;
  onDateClick: (date: string) => void;
  onError: (message: string) => void;
}

const BookingManagementViews: React.FC<CalendarListViewProps> = ({
  infrastructureId,
  selectedInfrastructure,
  refreshTrigger,
  onDateClick,
  onError
}) => {
  // State management
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
  const [calendarItems, setCalendarItems] = useState<CalendarItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<string>('');
  const [showOnly, setShowOnly] = useState<'all' | 'timeslots' | 'bookings'>('all');

  // Load data when component mounts or when refreshTrigger changes
  useEffect(() => {
    if (infrastructureId) {
      fetchCalendarData();
    }
  }, [infrastructureId, refreshTrigger]);

  // // Fetch both timeslots and bookings
  // const fetchCalendarData = async () => {
  //   try {
  //     setIsLoading(true);
  //     const token = localStorage.getItem('token');

  //     // Calculate month range
  //     const currentMonth = new Date();
  //     const year = currentMonth.getFullYear();
  //     const month = currentMonth.getMonth();
  //     const firstDay = new Date(year, month, 1);
  //     const lastDay = new Date(year, month + 1, 0);

  //     const startDate = firstDay.toISOString().split('T')[0];
  //     const endDate = lastDay.toISOString().split('T')[0];

  //     // Fetch timeslots
  //     const timeslotsResponse = await fetch(
  //       `http://localhost:3001/api/bookings/available/${infrastructureId}?startDate=${startDate}&endDate=${endDate}`,
  //       {
  //         headers: { 'Authorization': `Bearer ${token}` }
  //       }
  //     );

  //     // Fetch bookings
  //     const bookingsResponse = await fetch(
  //       `http://localhost:3001/api/bookings/infrastructure/${infrastructureId}?startDate=${startDate}&endDate=${endDate}`,
  //       {
  //         headers: { 'Authorization': `Bearer ${token}` }
  //       }
  //     );

  //     if (!timeslotsResponse.ok || !bookingsResponse.ok) {
  //       throw new Error('Failed to fetch calendar data');
  //     }

  //     const timeslots = await timeslotsResponse.json();
  //     const bookings = await bookingsResponse.json();

  //     // Transform data for unified display
  //     const combinedItems: CalendarItem[] = [
  //       ...timeslots.map((ts: any) => ({
  //         type: 'timeslot' as const,
  //         id: ts.id,
  //         date: ts.booking_date,
  //         start_time: ts.start_time,
  //         end_time: ts.end_time,
  //         status: 'available'
  //       })),
  //       ...bookings.map((booking: any) => ({
  //         type: 'booking' as const,
  //         id: booking.id,
  //         date: booking.booking_date,
  //         start_time: booking.start_time,
  //         end_time: booking.end_time,
  //         status: booking.status,
  //         user_email: booking.user_email,
  //         purpose: booking.purpose
  //       }))
  //     ];

  //     setCalendarItems(combinedItems);
  //   } catch (error) {
  //     console.error('Error fetching calendar data:', error);
  //     onError('Error loading calendar data');
  //   } finally {
  //     setIsLoading(false);
  //   }
  // };

  // Fetch both timeslots and bookings
  const fetchCalendarData = async () => {
    try {
      setIsLoading(true);

      // Calculate month range
      const currentMonth = new Date();
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);

      const startDate = firstDay.toISOString().split('T')[0];
      const endDate = lastDay.toISOString().split('T')[0];

      // Use the API utilities with date parameters
      const timeslots = await getInfrastAvailTimeslots(infrastructureId, {
        startDate,
        endDate
      });

      const bookings = await getInfrastructureBookings(infrastructureId, {
        startDate,
        endDate
      });

      // Transform data for unified display
      const combinedItems: CalendarItem[] = [
        ...timeslots.map((ts: any) => ({
          type: 'timeslot' as const,
          id: ts.id,
          date: ts.booking_date,
          start_time: ts.start_time,
          end_time: ts.end_time,
          status: 'available'
        })),
        ...bookings.map((booking: any) => ({
          type: 'booking' as const,
          id: booking.id,
          date: booking.booking_date,
          start_time: booking.start_time,
          end_time: booking.end_time,
          status: booking.status,
          user_email: booking.user_email,
          purpose: booking.purpose
        }))
      ];

      setCalendarItems(combinedItems);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      onError('Error loading calendar data');
    } finally {
      setIsLoading(false);
    }
  };


  // Handle date selection from calendar view
  const handleCalendarDateClick = (date: string) => {
    setDateFilter(date);
    setViewMode('list');
  };

  // Filter calendar items based on date and type
  const filteredItems = useMemo(() => {
    return calendarItems.filter(item => {
      // Apply date filtering more precisely, comparing year/month/day components
      let dateMatches = true;
      if (dateFilter) {
        const itemDate = new Date(item.date);
        const filterDate = new Date(dateFilter);

        dateMatches = (
          itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth() &&
          itemDate.getDate() === filterDate.getDate()
        );
      }

      // Filter by type if showOnly is not 'all'
      const typeMatches =
        showOnly === 'all' ||
        (showOnly === 'timeslots' && item.type === 'timeslot') ||
        (showOnly === 'bookings' && item.type === 'booking');

      return dateMatches && typeMatches;
    });
  }, [calendarItems, dateFilter, showOnly]);

  // Clear date filter
  const handleClearDateFilter = () => {
    setDateFilter('');
  };

  return (
    <Card className="card1 mb-8 p-2">
      {/* View tabs and filter tabs */}
      <div className="flex flex-col space-y-4">
        {/* View toggle tabs (Calendar/List) */}
        <Tabs
          defaultValue={viewMode}
          value={viewMode}
          onValueChange={(value) => setViewMode(value as 'calendar' | 'list')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2 gap-4">
            <TabsTrigger value="calendar" className="flex items-center justify-center">
              <Calendar className="h-4 w-4 mr-2" />
              Calendar View
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center justify-center">
              <List className="h-4 w-4 mr-2" />
              List View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filter tabs (All/Timeslots/Bookings) */}
        <Tabs
          defaultValue={showOnly}
          value={showOnly}
          onValueChange={(value) => setShowOnly(value as 'all' | 'timeslots' | 'bookings')}
          className="w-full"
        >
          <TabsList className="w-[calc(100%-10rem)] mx-auto grid grid-cols-3 gap-4" >

            <TabsTrigger value="all">
              All
            </TabsTrigger>
            <TabsTrigger value="timeslots">
              Timeslots
            </TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Date filter - only shown in list view */}
        {viewMode === 'list' && (
          <div className="flex items-center space-x-4">
            <div className="flex-grow flex items-center justify-center pt-2 -mb-3 gap-2">
              <Label htmlFor="dateFilter">Filter by Date:</Label>
              <Input
                id="dateFilter"
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-auto"
              />
              {dateFilter && (
                <Button
                  onClick={handleClearDateFilter}
                  size="sm"
                >
                  Clear Filter
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      {isLoading ? (
        <Card className="p-8 text-center">Loading calendar data...</Card>
      ) : (
        <div className="mt-6">
          {viewMode === 'calendar' ? (
            <BookingManagementViewsCalendar
              items={calendarItems}
              showOnly={showOnly}
              dateFilter={dateFilter}
              onDateClick={handleCalendarDateClick}
            />
          ) : (
            <BookingManagementViewsList
              items={filteredItems}
              onStatusChange={() => fetchCalendarData()}
              onError={onError}
            />
          )}

          {!isLoading && calendarItems.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              No bookings or timeslots for this infrastructure.
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default BookingManagementViews;