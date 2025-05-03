import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

import BookingManagementTabsBookings from './BookingManagementTabsBookings';
import BookingManagementTabsTimeslots from './BookingManagementTabsTimeslots';
import BookingManagementTabsCreate from './BookingManagementTabsCreate';
import { FilterSortState } from './BookingManagement';

import {
  BookingEntry,
  Infrastructure,
} from '@/utils';

import { useTranslation } from 'react-i18next';


interface BookingManagementTabsProps {
  selectedInfrastructure: Infrastructure
  bookingEntries: BookingEntry[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onUpdatePastBookings: () => Promise<void>;
  onDataChange: () => void;
  filterState: FilterSortState;
  onFilterStateChange: (newState: Partial<FilterSortState>) => void;
}

const BookingManagementTabs: React.FC<BookingManagementTabsProps> = ({
  selectedInfrastructure,
  bookingEntries,
  onSuccess,
  onError,
  onUpdatePastBookings,
  onDataChange,
  filterState,
  onFilterStateChange
}) => {
  // Use the activeTab from parent's filterState
  const { activeTab } = filterState;

  const [isUpdating, setIsUpdating] = useState(false);

  const { t,i18n } = useTranslation();

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdatePastBookings();
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter bookings (entries where booking_type is 'booking')
  const bookings = bookingEntries.filter(entry => entry.booking_type === 'booking');

  // Filter timeslots (entries where booking_type is 'timeslot')
  const timeslots = bookingEntries.filter(entry => entry.booking_type === 'timeslot');

  return (
    <Card className="card1 mb-8 min-w-270">
      <div className="p-6">
        <div className="flex flex-col items-center mb-4 mx-auto" dir={i18n.dir()}>
          <Button
            onClick={handleForceUpdate}
            className="apply h-8 w-135"
            disabled={isUpdating}
            // dir={i18n.dir()}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {isUpdating ? t('Updating') : t('ForceUpdatePastStatuses',"Force Update Past Bookings/Timeslots Statuses")}
          </Button>
          <p className="explanation-text1 text-sm text-center">
            {t('forceUpdateExplanation')}
            {/* Normally an update occurs automatically every few minutes, but you can force an update at any time. */}
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => onFilterStateChange({ activeTab: value })}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookings">
              {t('Manage Bookings')}
            </TabsTrigger>
            <TabsTrigger value="timeslots">
              {t('Manage Timeslots')}
            </TabsTrigger>
            <TabsTrigger value="create">{t('Create Timeslots','Create Timeslots')}</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings">
            <BookingManagementTabsBookings
              items={bookings}
              selectedInfrastructure={selectedInfrastructure}
              onStatusChange={onSuccess}
              onError={onError}
              onDataChange={onDataChange}
              filterState={filterState}
              onFilterStateChange={onFilterStateChange}
            />
          </TabsContent>
          <TabsContent value="timeslots">
            <BookingManagementTabsTimeslots
              selectedInfrastructure={selectedInfrastructure}
              items={timeslots}
              onDelete={onSuccess}
              onError={onError}
              onDataChange={onDataChange}
              filterState={filterState}
              onFilterStateChange={onFilterStateChange}
            />
          </TabsContent>
          <TabsContent value="create">
            <BookingManagementTabsCreate
              selectedInfrastructure={selectedInfrastructure}
              onSuccess={onSuccess}
              onError={onError}
              onDataChange={onDataChange}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

export default BookingManagementTabs;