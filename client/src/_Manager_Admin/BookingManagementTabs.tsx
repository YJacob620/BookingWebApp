import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

import BookingManagementTabsBookings from './BookingManagementTabsBookings';
import BookingManagementTabsTimeslots from './BookingManagementTabsTimeslots';
import BookingManagementTabsCreate from './BookingManagementTabsCreate';

import { BookingEntry, Infrastructure } from '@/_utils';


interface BookingManagementTabsProps {
  selectedInfrastructure: Infrastructure
  bookingEntries: BookingEntry[];
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onUpdatePastBookings: () => Promise<void>;
  onDataChange: () => void;
  isAdmin: boolean;
}

const BookingManagementTabs: React.FC<BookingManagementTabsProps> = ({
  selectedInfrastructure,
  bookingEntries,
  onSuccess,
  onError,
  onUpdatePastBookings,
  onDataChange,
  isAdmin
}) => {
  const [activeTab, setActiveTab] = useState<string>("bookings");
  const [isUpdating, setIsUpdating] = useState(false);

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
        {/* Only show force update button to admins */}
        {isAdmin && (
          <div className="flex flex-col items-center mb-4 mx-auto">
            <Button
              onClick={handleForceUpdate}
              className="apply h-8 w-135"
              disabled={isUpdating}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {isUpdating ? "Updating..." : "Force Update Past Bookings/Timeslots Statuses"}
            </Button>
            <p className="explanation-text1 text-sm text-center">
              Normally an update occurs automatically every few minutes, but you can force an update at any time.
            </p>
          </div>
        )}

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="bookings">
              Manage Bookings {/*`(${bookings.length})`*/}
            </TabsTrigger>
            <TabsTrigger value="timeslots">
              Manage Timeslots {/*`(${timeslots.length})`*/}
            </TabsTrigger>
            <TabsTrigger value="create">Create Timeslots</TabsTrigger>
          </TabsList>
          <TabsContent value="bookings">
            <BookingManagementTabsBookings
              items={bookings}
              selectedInfrastructure={selectedInfrastructure}
              onStatusChange={onSuccess}
              onError={onError}
              onDataChange={onDataChange}
            />
          </TabsContent>
          <TabsContent value="timeslots">
            <BookingManagementTabsTimeslots
              selectedInfrastructure={selectedInfrastructure}
              items={timeslots}
              onDelete={onSuccess}
              onError={onError}
              onDataChange={onDataChange}
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