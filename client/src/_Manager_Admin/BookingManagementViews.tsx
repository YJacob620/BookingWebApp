import { useState, useEffect, useMemo } from 'react';
import { Card } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarIcon, List } from "lucide-react";

import {
  BookingEntry,
  formatDate,
} from '@/utils';

import BookingManagementViewsCalendar from './BookingManagementViewsCalendar';
import BookingManagementViewsList from './BookingManagementViewsList';
import { FilterSortState } from './BookingManagement';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';


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
  const { t, i18n } = useTranslation();

  //state for date selector
  const [t_bookingDayFilter, set_t_bookingDayFilter] = useState<Date | undefined>(undefined);

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
    set_t_bookingDayFilter(undefined)
  };

  const handleDateFilterChange = (date: Date|undefined) => {
    // Clear predefined date filters if custom date is set
    if (date) {
      onFilterStateChange({
        viewsDayFilter: date.toDateString()
      });
    } else {
      onFilterStateChange({ viewsDayFilter: '' });
    }
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
              <CalendarIcon className="h-4 w-4 mr-2" />
              {t('bookingManagementViews.calendarView')}
            </TabsTrigger>
            <TabsTrigger value="list" className="flex items-center justify-center">
              <List className="h-4 w-4 mr-2" />
              {t('bookingManagementViews.listView')}
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
              {t('common.all')}
            </TabsTrigger>
            <TabsTrigger value="timeslots">
              {t('common.timeslots')}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              {t('common.bookings')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Date filter - only shown in list view */}
        {viewMode === 'list' && (
          <div className="flex items-center space-x-4">
            <div className="flex-grow flex items-center justify-center pt-2 -mb-3 gap-2" dir={i18n.dir()}>
              <Label>{t('bookingManagementViews.filterByDate')}</Label>
              {/* <Input
                id="dateFilter"
                type="date"
                value={viewsDayFilter}
                onChange={(e) => onFilterStateChange({ viewsDayFilter: e.target.value })}
                className="w-auto"
              /> */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    className={`px-2 h-9 justify-start text-left flex w-45 min-w-0 ${!t_bookingDayFilter && "text-gray-400"
                      }`}
                    variant="outline"
                    id="dateFilter"
                    dir={i18n.dir()}
                  >
                    <CalendarIcon className="h-4 w-4" />
                    {t_bookingDayFilter
                      ? formatDate(t_bookingDayFilter, i18n.language)
                      : t("bookingManagementTabsCreate.selectDate")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="calendar-popover">
                  <Calendar
                    mode="single"
                    selected={t_bookingDayFilter}
                    onSelect={(date) => {
                      set_t_bookingDayFilter(date)
                      handleDateFilterChange(date)
                    }}
                  disabled={(date) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return date < today;
                  }}
                  />
                </PopoverContent>
              </Popover>
              {viewsDayFilter && (
                <Button
                  variant={"custom5"}
                  className="px-2 py-1 text-md"
                  onClick={handleClearDateFilter}
                  disabled={!viewsDayFilter}
                >
                  {t('common.clear')}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main content area */}
      {isLoading ? (
        <Card className="p-8 text-center">{t('common.loadingCalendarData')}</Card>
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
            <div className="text-center py-8 text-gray-400" dir={i18n.dir()}>
              {t('bookingManagementViews.noBookingsOrTimeslots')}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default BookingManagementViews;