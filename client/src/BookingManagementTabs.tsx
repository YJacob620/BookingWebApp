import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw } from "lucide-react";

// Import tab content components
import BookingManagementTabsBookings from './BookingManagementTabsBookings';
import BookingManagementTabsTimeslots from './BookingManagementTabsTimeslots';
import BookingManagementTabsCreate from './BookingManagementTabsCreate';

interface Infrastructure {
  id: number;
  name: string;
  location?: string;
  max_booking_duration?: number;
}

interface BookingManagementTabsProps {
  infrastructureId: number;
  selectedInfrastructure: Infrastructure;
  refreshTrigger: number;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onUpdatePastBookings: () => Promise<void>;
}

const BookingManagementTabs: React.FC<BookingManagementTabsProps> = ({
  infrastructureId,
  selectedInfrastructure,
  refreshTrigger,
  onSuccess,
  onError,
  onUpdatePastBookings
}) => {
  const [activeTab, setActiveTab] = useState<string>("timeslots");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleForceUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdatePastBookings();
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="card1 mb-8">
      <div className="p-6">
        {/* Add the button above the tabs */}
        <div className="flex justify-center mb-4 grid grid-cols-1 w-[calc(100%-10rem)] mx-auto">
          <Button
            onClick={handleForceUpdate}
            className="apply h-8"
            disabled={isUpdating}
          >
            <RefreshCcw className="mr-2 h-4 w-4" />
            {isUpdating ? "Updating..." : "Force Update Past Bookings/Timeslots Statuses"}
          </Button>
          <p className="explanation-text1 text-sm">
            Normally an update occurs automatically every few minutes, but you can force an update at any time.
          </p>
        </div>

        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 gap-4 mb-5">
            <TabsTrigger value="bookings">Manage Bookings</TabsTrigger>
            <TabsTrigger value="timeslots">Manage Timeslots</TabsTrigger>
            <TabsTrigger value="create">Create Timeslots</TabsTrigger>
          </TabsList>

          <TabsContent value="bookings">
            <BookingManagementTabsBookings
              infrastructureId={infrastructureId}
              selectedInfrastructure={selectedInfrastructure}
              onStatusChange={onSuccess}
              onError={onError}
              refreshTrigger={refreshTrigger}
            />
          </TabsContent>

          <TabsContent value="timeslots">
            <BookingManagementTabsTimeslots
              infrastructureId={infrastructureId}
              selectedInfrastructure={selectedInfrastructure}
              onDelete={onSuccess}
              onError={onError}
            />
          </TabsContent>

          <TabsContent value="create">
            <BookingManagementTabsCreate
              infrastructureId={infrastructureId}
              onSuccess={onSuccess}
              onError={onError}
            />
          </TabsContent>
        </Tabs>
      </div>
    </Card>
  );
};

export default BookingManagementTabs;