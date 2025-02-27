import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { ArrowLeftCircle, CalendarCheck } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { format, isBefore, startOfDay, parseISO } from "date-fns";

import { Infrastructure, Timeslot } from '@/types';

const CreateBooking = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [allTimeslots, setAllTimeslots] = useState<Timeslot[]>([]);
  const [availableTimeslots, setAvailableTimeslots] = useState<Timeslot[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedInfrastructureId, setSelectedInfrastructureId] = useState<number | null>(null);
  const [selectedTimeslotId, setSelectedTimeslotId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoadingTimeslots, setIsLoadingTimeslots] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    fetchInfrastructures(token);
  }, [navigate]);

  // Fetch infrastructures when component mounts
  const fetchInfrastructures = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/infrastructures/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch infrastructures');
      }

      const data = await response.json();
      setInfrastructures(data);
    } catch (error) {
      console.error('Error fetching infrastructures:', error);
      setMessage({ type: 'error', text: 'Error loading infrastructures. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch ALL available timeslots for the selected infrastructure
  useEffect(() => {
    if (selectedInfrastructureId) {
      fetchAllAvailableTimeslots();
    } else {
      setAllTimeslots([]);
      setAvailableTimeslots([]);
    }
  }, [selectedInfrastructureId]);

  const fetchAllAvailableTimeslots = async () => {
    if (!selectedInfrastructureId) return;

    try {
      setIsLoadingTimeslots(true);
      const token = localStorage.getItem('token');

      const response = await fetch(
        `http://localhost:3001/api/bookings/available/${selectedInfrastructureId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch available timeslots');
      }

      const data = await response.json();
      setAllTimeslots(data);
    } catch (error) {
      console.error('Error fetching available timeslots:', error);
      setMessage({ type: 'error', text: 'Error loading available timeslots' });
    } finally {
      setIsLoadingTimeslots(false);
    }
  };

  // Calculate the list of dates that have available timeslots
  const availableDates = useMemo(() => {
    if (!allTimeslots.length) return [];

    // Extract unique dates as Date objects
    const uniqueDates = [...new Set(allTimeslots.map(slot => new Date(slot.booking_date)))];

    return uniqueDates;
  }, [allTimeslots]);


  // Filter timeslots for the selected date
  useEffect(() => {
    if (selectedDate && allTimeslots.length > 0) {
      const selectedDay = startOfDay(selectedDate).getTime();

      const filtered = allTimeslots.filter(slot => {
        const slotDay = startOfDay(parseISO(slot.booking_date)).getTime();
        return slotDay === selectedDay;
      });

      setAvailableTimeslots(filtered);
    } else {
      setAvailableTimeslots([]);
    }
  }, [selectedDate, allTimeslots]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTimeslotId) {
      setMessage({ type: 'error', text: 'Please select a timeslot and provide a purpose for your booking' });
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/bookings/request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          timeslot_id: selectedTimeslotId,
          purpose: purpose
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create booking');
      }

      setMessage({ type: 'success', text: 'Booking request submitted successfully' });

      // Reset form
      setSelectedTimeslotId(null);
      setPurpose('');

      // Refresh available timeslots
      fetchAllAvailableTimeslots();

      // Redirect after a short delay
      setTimeout(() => {
        navigate('/user-dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error creating booking:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred while creating your booking'
      });
    }
  };

  // Format time for display
  const formatTime = (timeString: string): string => {
    const time = new Date(`1970-01-01T${timeString}`);
    return time.toLocaleTimeString('en-UK', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  // Check if a date should be disabled in the calendar
  const isDateDisabled = (date: Date) => {
    // If no infrastructure is selected or no timeslots are available, disable future dates
    if (!selectedInfrastructureId || allTimeslots.length === 0) return true;

    // Disable dates in the past
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;

    // If we're still loading timeslots, disable future dates
    if (isLoadingTimeslots) return true;

    // console.log("date:", date);
    const isAvailable = availableDates.some(d => d.getTime() === date.getTime());
    return !isAvailable;
  };

  return (
    <Card className="general-container">
      <div className="max-w-7xl mx-auto px-4 py-1">
        <div className="flex justify-start mb-6">
          <Button
            onClick={() => navigate('/user-dashboard')}
            className="back-button"
          >
            <ArrowLeftCircle className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1>Create New Booking</h1>
        </div>

        {message && (
          <Alert
            className={`mb-6 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
          >
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        <Card className="card1 mb-8">
          <CardTitle className="text-2xl py-4">Book Infrastructures</CardTitle>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Infrastructure Selection */}
              <div className="space-y-2">
                <p className="small-title">Select Infrastructure</p>
                <Select
                  onValueChange={(value) => {
                    setSelectedInfrastructureId(Number(value));
                    // Reset date and timeslot when changing infrastructure
                    setSelectedDate(undefined);
                    setSelectedTimeslotId(null);
                  }}
                  value={selectedInfrastructureId?.toString() || ""}
                >
                  <SelectTrigger id="infrastructure">
                    <SelectValue placeholder="Select an infrastructure" />
                  </SelectTrigger>
                  <SelectContent className="card1">
                    {infrastructures.map((infra) => (
                      <SelectItem key={infra.id} value={infra.id.toString()}>
                        {infra.name} {infra.location ? `(${infra.location})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Selection */}
              <div className="space-y-2">
                <p className="small-title">Select Date</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={`def-hover w-full h-9 px-2 text-[14px] justify-start text-left font-normal 
                        ${!selectedDate && "text-gray-400"}`}
                    >
                      <CalendarCheck className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : "Select a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="calendar-popover">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        setSelectedDate(date);
                        setSelectedTimeslotId(null); // Reset timeslot when date changes
                      }}
                      disabled={isDateDisabled}
                    />

                  </PopoverContent>
                </Popover>
                {isLoadingTimeslots && <p className="text-sm text-gray-400">Loading available dates...</p>}
                {!isLoadingTimeslots && selectedInfrastructureId && availableDates.length === 0 && (
                  <p className="text-sm text-amber-500">No available timeslots for this infrastructure</p>
                )}
              </div>

              {/* Timeslot Selection */}
              <div className="space-y-2">
                <p className="small-title">Select Timeslot</p>
                <Select
                  onValueChange={(value) => setSelectedTimeslotId(Number(value))}
                  value={selectedTimeslotId?.toString() || ""}
                  disabled={availableTimeslots.length === 0 || !selectedDate}
                >
                  <SelectTrigger id="timeslot">
                    <SelectValue placeholder={
                      !selectedInfrastructureId
                        ? "Select infrastructure first" : !selectedDate
                          ? "Select a date first" : availableTimeslots.length === 0
                            ? "No available timeslots for this date" : "Select a timeslot"
                    } />
                  </SelectTrigger>
                  <SelectContent className="card1">
                    {availableTimeslots.map((slot) => (
                      <SelectItem key={slot.id} value={slot.id.toString()}>
                        {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Purpose */}
              <div className="space-y-2">
                <p className="small-title">Purpose of Booking (optional)</p>
                <Textarea
                  id="purpose"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="Briefly describe the purpose of your booking"
                  className="h-24"
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={!selectedTimeslotId}
                className="w-full"
              >
                Submit Booking Request
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </Card>
  );
};

export default CreateBooking;