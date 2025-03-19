import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, CalendarRange } from "lucide-react";
import { format } from "date-fns";

import {
  calculateDuration,
  isEndTimeAfterStartTime,
  isTimeFormatValid,
  createTimeslots,
  BatchCreationPayload,
  Infrastructure
} from "@/_utils";

interface BookingManagementTabsCreateProps {
  selectedInfrastructure: Infrastructure;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
  onDataChange: () => void;
}

const BookingManagementTabsCreate: React.FC<BookingManagementTabsCreateProps> = ({
  selectedInfrastructure,
  onSuccess,
  onError,
  onDataChange
}) => {
  // Shared state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Single slot state
  const [singleDate, setSingleDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  // Batch slots state
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [dailyStartTime, setDailyStartTime] = useState("09:00");
  const [slotDuration, setSlotDuration] = useState("60");
  const [slotsPerDay, setSlotsPerDay] = useState("8");

  // Create a single slot using the batch API endpoint
  const handleSingleSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!singleDate) {
      onError("Please select a date");
      return;
    }

    if (!startTime || !endTime) {
      onError("Please enter both start and end time");
      return;
    }

    if (!isTimeFormatValid(startTime) || !isTimeFormatValid(endTime)) {
      onError("Please enter valid time format (HH:MM)");
      return;
    }

    if (!isEndTimeAfterStartTime(startTime, endTime)) {
      onError("End time must be after start time");
      return;
    }

    // Use the batch endpoint with single day parameters
    const payload: BatchCreationPayload = {
      infrastructureID: selectedInfrastructure.id,
      startDate: format(singleDate, "yyyy-MM-dd"),
      endDate: format(singleDate, "yyyy-MM-dd"),
      dailyStartTime: startTime,
      slotDuration: calculateDuration(startTime, endTime),
      slotsPerDay: 1
    };
    await createBatchSlots(payload);
  };

  // Create batch slots
  const handleBatchSlotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!startDate || !endDate) {
      onError("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      onError("End date must be after start date");
      return;
    }

    if (!dailyStartTime || !isTimeFormatValid(dailyStartTime)) {
      onError("Please enter a valid daily start time");
      return;
    }

    if (!slotDuration || isNaN(parseInt(slotDuration)) || parseInt(slotDuration) <= 0) {
      onError("Please enter a valid slot duration");
      return;
    }

    if (!slotsPerDay || isNaN(parseInt(slotsPerDay)) || parseInt(slotsPerDay) <= 0) {
      onError("Please enter a valid number of slots per day");
      return;
    }

    const payload: BatchCreationPayload = {
      infrastructureID: selectedInfrastructure.id,
      startDate: format(startDate, "yyyy-MM-dd"),
      endDate: format(endDate, "yyyy-MM-dd"),
      dailyStartTime,
      slotDuration: parseInt(slotDuration),
      slotsPerDay: parseInt(slotsPerDay)
    };

    await createBatchSlots(payload);
  };

  // Shared function to create slots
  const createBatchSlots = async (payload: BatchCreationPayload) => {
    setIsSubmitting(true);

    try {
      const data = await createTimeslots(payload);

      // Create success message based on created/skipped counts
      let successMessage = `Successfully created ${data.created} timeslot(s)`;
      if (data.skipped > 0) {
        successMessage += ` (${data.skipped} skipped due to overlap)`;
      }
      onSuccess(successMessage);
      resetForms(); // Reset forms
      onDataChange(); // Refresh the data
    } catch (error) {
      console.error('Error creating timeslots:', error);
      onError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset both forms
  const resetForms = () => {
    // Reset single slot form
    setSingleDate(undefined);
    setStartTime("");
    setEndTime("");

    // Reset batch slot form
    setStartDate(undefined);
    setEndDate(undefined);
    setDailyStartTime("09:00");
    setSlotDuration("60");
    setSlotsPerDay("8");
  };

  return (
    <div>
      <div className="mb-4">
        <p className="explanation-text1">
          Create new timeslots for this infrastructure.
        </p>
      </div>

      <Tabs defaultValue="single" className="w-full">
        <TabsList className="w-[calc(100%-8rem)] mx-auto grid grid-cols-2">
          <TabsTrigger value="single">Create Single Slot</TabsTrigger>
          <TabsTrigger value="batch">Batch Create Slots</TabsTrigger>
        </TabsList>

        <TabsContent value="single">
          <Card className="card1">
            <CardContent className="pt-6">
              <form onSubmit={handleSingleSlotSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Date Selector */}
                  <div className="space-y-2">
                    <p className="small-title">Date</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          className={`px-2 w-full h-9 justify-start text-left ${!singleDate && "text-gray-400"}`}
                          variant="outline"
                          id="date"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {singleDate ? format(singleDate, "PPP") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="calendar-popover">
                        <Calendar
                          mode="single"
                          selected={singleDate}
                          onSelect={setSingleDate}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Start Time */}
                  <div className="space-y-2">
                    <p className="small-title">Start Time (HH:MM)</p>
                    <Input
                      id="startTime"
                      type="time"
                      placeholder="09:00"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>

                  {/* End Time */}
                  <div className="space-y-2">
                    <p className="small-title">End Time (HH:MM)</p>
                    <Input
                      id="endTime"
                      type="time"
                      placeholder="10:00"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button
                    type="submit"
                    disabled={isSubmitting || !singleDate || !startTime || !endTime}
                    className="apply"
                  >
                    {isSubmitting ? "Creating..." : "Create Slot"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="batch">
          <Card className="card1">
            <CardContent className="pt-6">
              <form onSubmit={handleBatchSlotSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  {/* Date Range */}
                  <div className="space-y-2">
                    <p className="small-title">Date Range</p>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          className={`px-2 w-full h-9 justify-start text-left ${!startDate || !endDate ? "text-gray-400" : ""}`}
                          variant="outline"
                        >
                          <CalendarRange className="mr-2 h-4 w-4" />
                          {startDate && endDate
                            ? `${format(startDate, "PP")} - ${format(endDate, "PP")}`
                            : "Select date range"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 card1" align="start">
                        <div className="flex flex-col sm:flex-row">
                          <div className="border-r border-gray-700">
                            <div className="p-2 text-center font-medium">Start Date</div>
                            <Calendar
                              mode="single"
                              selected={startDate}
                              onSelect={setStartDate}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return date < today;
                              }}
                            />
                          </div>
                          <div>
                            <div className="p-2 text-center font-medium">End Date</div>
                            <Calendar
                              mode="single"
                              selected={endDate}
                              onSelect={setEndDate}
                              disabled={(date) => {
                                const today = new Date();
                                today.setHours(0, 0, 0, 0);
                                return (
                                  date < today ||
                                  (startDate ? date < startDate : false)
                                );
                              }}
                              initialFocus
                            />
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Daily Start Time */}
                  <div className="space-y-2">
                    <Label>Daily Start Time (HH:MM)</Label>
                    <Input
                      id="dailyStartTime"
                      type="text"
                      placeholder="09:00"
                      value={dailyStartTime}
                      onChange={(e) => setDailyStartTime(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Slot Duration (minutes) */}
                  <div className="space-y-2">
                    <Label>Slot Duration (minutes)</Label>
                    <Input
                      id="slotDuration"
                      type="number"
                      min="5"
                      max="480"
                      placeholder="60"
                      value={slotDuration}
                      onChange={(e) => setSlotDuration(e.target.value)}
                    />
                  </div>

                  {/* Slots Per Day */}
                  <div className="space-y-2">
                    <Label>Slots Per Day</Label>
                    <Input
                      id="slotsPerDay"
                      type="number"
                      min="1"
                      max="24"
                      placeholder="8"
                      value={slotsPerDay}
                      onChange={(e) => setSlotsPerDay(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={
                      isSubmitting ||
                      !startDate ||
                      !endDate ||
                      !dailyStartTime ||
                      !slotDuration ||
                      !slotsPerDay
                    }
                    className="apply"
                  >
                    {isSubmitting ? "Creating..." : "Create Batch Slots"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BookingManagementTabsCreate;