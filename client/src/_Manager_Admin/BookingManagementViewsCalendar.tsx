import React, { useState, useEffect, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, Calendar, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from 'react-i18next';

import {
  getStatusColor,
  BookingEntry,
  formatTimeString
} from "@/utils"

interface BookingsCalendarViewProps {
  bookingEntries: BookingEntry[];
  showOnly: 'all' | 'timeslots' | 'bookings';
  dateFilter?: string;
  onDateClick: (date: string) => void;
}

const BookingManagementViewsCalendar: React.FC<BookingsCalendarViewProps> = ({
  bookingEntries,
  showOnly: typeFilter,
  dateFilter,
  onDateClick
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { t } = useTranslation();

  // Calendar navigation
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  // Filter items based on type (showOnly)
  const filteredItemsByType = useMemo(() => {

    return bookingEntries.filter(item =>
      typeFilter === 'all' ||
      (typeFilter === 'timeslots' && item.booking_type === 'timeslot') ||
      (typeFilter === 'bookings' && item.booking_type === 'booking')
    );
  }, [bookingEntries, typeFilter]);

  // If dateFilter is active, ensure the calendar displays the right month
  useEffect(() => {
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      // Only update if the month is different from current view
      if (filterDate.getMonth() !== currentMonth.getMonth() ||
        filterDate.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(new Date(filterDate.getFullYear(), filterDate.getMonth(), 1));
      }
    }

  }, [bookingEntries, dateFilter]);

  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);

    // Create days array with empty slots for previous month days
    const days = Array(firstDayOfMonth).fill(null);

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    // Group calendar items by date
    const itemsByDate: Record<string, BookingEntry[]> = {};

    filteredItemsByType.forEach(item => {
      const itemDate = new Date(item.booking_date);

      // Only include items for the current month/year
      if (itemDate.getMonth() === month && itemDate.getFullYear() === year) {
        const day = itemDate.getDate();
        if (!itemsByDate[day]) {
          itemsByDate[day] = [];
        }
        itemsByDate[day].push(item);
      }
    });

    return { days, itemsByDate };
  }, [currentMonth, filteredItemsByType]);

  // Format month
  const formattedMonth = currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' });

  // Format date for filtering
  const formatDateForFilter = (day: number): string => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  return (
    <div className="calendar-view">
      <div className="flex justify-center">
        <div className="flex items-center space-x-2">
          <Button
            className="h-8 w-8 p-0"
            onClick={goToPreviousMonth}
            title={t('common.previousMonth')}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-medium min-w-50">{formattedMonth}</span>
          <Button
            className="h-8 w-8 p-0"
            onClick={goToNextMonth}
            title={t('common.nextMonth')}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {/* Calendar header (days of week) */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-medium py-2 text-gray-400">
            {t(`common.daysOfWeek.${day.toLowerCase()}`)}
          </div>
        ))}

        {/* Calendar days */}
        {calendarData.days.map((day, index) => {
          const dayItems = day ? calendarData.itemsByDate[day] || [] : [];
          const hasItems = dayItems.length > 0;
          const formattedDate = day ? formatDateForFilter(day) : '';

          return (
            <Card
              key={index}
              className={`${!day ? 'bg-transparent border-transparent' :
                hasItems ? 'cursor-pointer def-hover' : 'opacity-60'
                }`}
              onClick={() => {
                if (day && hasItems) {
                  onDateClick(formattedDate);
                }
              }}
            >
              {day && (
                <CardContent className="p-2 flex flex-col h-full">
                  <div className="flex justify-between items-center mb-2 font-medium">
                    {day}
                    {hasItems && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            className="h-6 w-10 p-0 rounded-full"
                            onClick={(e) => {
                              // Stop event propagation to prevent triggering the parent Card's onClick
                              e.stopPropagation();
                            }}
                          >
                            <Calendar className="h-3 w-3" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-80 p-0 card1"
                          onClick={(e) => {
                            // Stop event propagation to prevent triggering the parent Card's onClick
                            e.stopPropagation();
                          }}
                        >
                          <div className="p-2 border-b border-gray-700">
                            <h3 className="font-medium">{formattedMonth} {day}</h3>
                          </div>
                          <div className="max-h-60 overflow-y-auto">
                            {dayItems.map((item) => (
                              <div key={`${item.booking_type}-${item.id}`} className="p-2 border-b border-gray-700 last:border-0">
                                <div className="flex justify-between items-center mb-1">
                                  <Badge className={getStatusColor(item.status)}>
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </Badge>
                                  <span className="text-sm text-gray-400">
                                    {formatTimeString(item.start_time)} - {formatTimeString(item.end_time)}
                                  </span>
                                </div>
                                {item.booking_type === 'booking' && (
                                  <>
                                    <div className="flex items-center small-title">
                                      <User className="h-3 w-3 mr-1" />
                                      {item.user_email}
                                    </div>
                                    {item.purpose && (
                                      <div className="text-sm text-gray-400 truncate">
                                        {item.purpose}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>

                  <div className="grid gap-1">
                    {/* Display summary of day's items */}
                    {dayItems.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          // Count by type and status
                          const counts: Record<string, number> = {};

                          dayItems.forEach(item => {
                            const key = item.status;
                            counts[key] = (counts[key] || 0) + 1;
                          });

                          return Object.entries(counts).map(([status, count]) => (
                            <Badge
                              key={status}
                              variant="outline"
                              className={`text-xs ${getStatusColor(status)}`}
                            >
                              {status === 'available' ? (
                                <><Clock className="h-3 w-3 mr-1" />{count}</>
                              ) : (
                                <>{status.charAt(0).toUpperCase()}: {count}</>
                              )}
                            </Badge>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default BookingManagementViewsCalendar;