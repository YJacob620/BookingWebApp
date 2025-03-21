import { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, List } from "lucide-react";

import {
  BookingEntry,
} from '@/_utils';

import BookingManagementViewsCalendar from './BookingManagementViewsCalendar';
import BookingManagementViewsList from './BookingManagementViewsList';
import { FilterSortState } from './BookingManagement';


const BookingManagementViews = ({
  bookingEntries,
  filterState,
  onFilterStateChange
}: {
  bookingEntries: BookingEntry[];
  filterState: FilterSortState;
  onFilterStateChange: (newState: Partial<FilterSortState>) => void;
}) => {
  const { viewsViewMode: viewMode, viewsTypeFilter: showOnly, viewsDayFilter } = filterState;
  const [isLoading, setIsLoading] = useState(true);

  // Load data when component mounts or when refreshTrigger changes
  useEffect(() => {
    if (bookingEntries) {
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }
  }, [bookingEntries]);

  const handleCalendarDateClick = (date: string) => {
    onFilterStateChange({ viewsDayFilter: date });
    onFilterStateChange({ viewsViewMode: 'list' });
  };

  // Filter calendar items based on date and type
  const filteredItems = useMemo(() => {
    return bookingEntries.filter(item => {
      let dateMatches = true;
      if (viewsDayFilter) {
        const itemDate = new Date(item.booking_date);
        const filterDate = new Date(viewsDayFilter);

        dateMatches = (
          itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth() &&
          itemDate.getDate() === filterDate.getDate()
        );
      }

      // Filter by type if showOnly is not 'all'
      const typeMatches =
        showOnly === 'all' ||
        (showOnly === 'timeslots' && item.booking_type === 'timeslot') ||
        (showOnly === 'bookings' && item.booking_type === 'booking');

      return dateMatches && typeMatches;
    });
  }, [viewsDayFilter, showOnly, bookingEntries]);

  // Clear date filter
  const handleClearDateFilter = () => {
    onFilterStateChange({ viewsDayFilter: '' });
  };

  return (
    <Card className="card1 mb-8 p-2">
      {/* View tabs and filter tabs */}
      <div className="flex flex-col space-y-4">
        {/* View toggle tabs (Calendar/List) */}
        <Tabs
          defaultValue={viewMode}
          value={viewMode}
          onValueChange={(value) => onFilterStateChange({ viewsViewMode: value as 'calendar' | 'list' })}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-2">
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

        <Tabs
          defaultValue={showOnly}
          value={showOnly}
          onValueChange={(value) => onFilterStateChange({ viewsTypeFilter: value as 'all' | 'timeslots' | 'bookings' })}
          className="w-full"
        >
          <TabsList className="w-[calc(100%-10rem)] mx-auto grid grid-cols-3" >

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
              <Label>Filter by Date:</Label>
              <Input
                id="dateFilter"
                type="date"
                value={viewsDayFilter}
                onChange={(e) => onFilterStateChange({ viewsDayFilter: e.target.value })}
                className="w-auto"
              />
              {viewsDayFilter && (
                <Button
                  variant={"custom5"}
                  className="px-2 py-1 text-md"
                  onClick={handleClearDateFilter}
                >
                  Clear
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
              bookingEntries={bookingEntries}
              showOnly={showOnly}
              dateFilter={viewsDayFilter}
              onDateClick={handleCalendarDateClick}
            />
          ) : (
            <BookingManagementViewsList
              bookingEntries={filteredItems}
            />
          )}

          {!isLoading && bookingEntries.length === 0 && (
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