import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { CalendarCheck } from "lucide-react";
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
import { format, isBefore, startOfDay } from "date-fns";

import {
  Infrastructure,
  BookingEntry,
  fetchActiveInfrastructures,
  bookTimeslot,
  fetchInfrastAvailTimeslots,
  bookTimeslotWithAnswers,
  fetchInfrastructureQuestions,
  FilterQuestionData,
  FilterQuestionAnswer,
} from '@/_utils';
import { LOGIN } from '@/RoutePaths';
import { Input } from '@/components/ui/input';
import BasePageLayout from '@/components/_BasePageLayout';

type UserAnswersMap = Record<number, FilterQuestionAnswer>;

const BookTimeslot = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
  const [allTimeslots, setAllTimeslots] = useState<BookingEntry[]>([]);
  const [availableTimeslots, setAvailableTimeslots] = useState<BookingEntry[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedInfrastructureId, setSelectedInfrastructureId] = useState<number | null>(null);
  const [selectedTimeslotId, setSelectedTimeslotId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [isLoadingTimeslots, setIsLoadingTimeslots] = useState(false);
  const [questions, setQuestions] = useState<FilterQuestionData[]>([]);
  const [answers, setAnswers] = useState<UserAnswersMap>({});

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate(LOGIN);
      return;
    }

    fetchInfrastructures();
  }, [navigate]);

  // Fetch infrastructures when component mounts
  const fetchInfrastructures = async () => {
    try {
      setIsLoading(true);

      // Use the imported fetchActiveInfrastructures utility
      const data = await fetchActiveInfrastructures();
      setInfrastructures(data);
    } catch (error) {
      console.error('Error fetching infrastructures:', error);
      setMessage({ type: 'error', text: 'Error loading infrastructures. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch all available timeslots for the selected infrastructure
  useEffect(() => {
    if (selectedInfrastructureId) {
      fetchAllAvailableTimeslots();
    } else {
      setAllTimeslots([]);
      setAvailableTimeslots([]);
    }
  }, [selectedInfrastructureId]);

  // Filter timeslots for the selected date
  useEffect(() => {
    if (selectedDate && allTimeslots.length > 0) {
      const selectedDay = startOfDay(selectedDate).getTime();

      const filtered = allTimeslots.filter(slot => {
        const slotDay = startOfDay(slot.booking_date).getTime();
        return slotDay === selectedDay;
      });

      setAvailableTimeslots(filtered);
    } else {
      setAvailableTimeslots([]);
    }
  }, [selectedDate, allTimeslots]);

  // Load questions when infrastructure is selected
  useEffect(() => {
    if (selectedInfrastructureId) {
      fetchInfrastructureQuestions(selectedInfrastructureId)
        .then(data => {
          setQuestions(data);
          // Initialize answers state with empty values
          const initialAnswers: UserAnswersMap = {};
          data.forEach(q => {
            initialAnswers[q.id] = q.question_type === 'document' ? null : '';
          });
          setAnswers(initialAnswers);
        })
        .catch(err => {
          console.error('Error fetching questions:', err);
        });
    }
  }, [selectedInfrastructureId]);

  const fetchAllAvailableTimeslots = async () => {
    if (!selectedInfrastructureId) return;

    try {
      setIsLoadingTimeslots(true);

      // Use the imported fetchInfrastAvailTimeslots utility
      const data = await fetchInfrastAvailTimeslots(selectedInfrastructureId);
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


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTimeslotId) {
      setMessage({
        type: 'error',
        text: 'Please select a timeslot'
      });
      return;
    }

    // Validate required answers if there are questions
    if (questions.length > 0) {
      const missingRequired = questions
        .filter(q => q.is_required)
        .filter(q => !answers[q.id])
        .map(q => q.question_text);

      if (missingRequired.length > 0) {
        setMessage({
          type: 'error',
          text: `Please answer the following required questions: ${missingRequired.join(', ')}`
        });
        return;
      }
    }

    // Create FormData for file uploads
    const formData = new FormData();
    formData.append('timeslot_id', selectedTimeslotId.toString());
    formData.append('purpose', purpose);

    // Add answers to form data if there are questions
    if (questions.length > 0) {
      Object.entries(answers).forEach(([questionId, answer]) => {
        if (answer instanceof File) {
          formData.append(`answers[${questionId}]`, answer);
        } else if (answer !== null && answer !== undefined) {
          formData.append(`answers[${questionId}]`, answer.toString());
        }
      });
    }

    try {
      setIsLoading(true);
      // If there are no questions, use regular bookTimeslot
      if (questions.length === 0) {
        await bookTimeslot({
          timeslot_id: selectedTimeslotId,
          purpose: purpose
        });
      } else {
        // Use FormData version for questions and file uploads
        await bookTimeslotWithAnswers(formData);
      }

      // Success logic
      setMessage({
        type: 'success',
        text: 'Your booking request has been submitted successfully!'
      });

      // Reset form
      setSelectedTimeslotId(null);
      setPurpose('');
      setSelectedDate(undefined);

      // Reset answers
      const initialAnswers: UserAnswersMap = {};
      questions.forEach(q => {
        initialAnswers[q.id] = q.question_type === 'document' ? null : '';
      });
      setAnswers(initialAnswers);

      // Redirect to booking history after a delay
      setTimeout(() => {
        navigate('/booking-history');
      }, 3000);
    } catch (error) {
      console.error('Error creating booking:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred while creating your booking'
      });
    } finally {
      setIsLoading(false);
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


  // Render dynamic question fields
  const renderQuestionFields = () => {
    return questions.map(q => (
      <div key={q.id} className="space-y-2">
        <p className="small-title">
          {q.question_text}
          {q.is_required && <span className="text-red-500 ml-1">*</span>}
        </p>

        {q.question_type === 'text' && (
          <Textarea
            value={answers[q.id]?.toString() || ''}
            onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
            required={q.is_required}
          />
        )}

        {q.question_type === 'number' && (
          <Input
            type="number"
            value={answers[q.id]?.toString() || ''}
            onChange={e => setAnswers({ ...answers, [q.id]: e.target.value })}
            required={q.is_required}
          />
        )}

        {q.question_type === 'dropdown' && q.options && (
          <Select
            value={answers[q.id]?.toString() || ''}
            onValueChange={value => setAnswers({ ...answers, [q.id]: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {q.options.split('\n').map((option, i) => (
                <SelectItem key={i} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {q.question_type === 'document' && (
          <div>
            <Input
              type="file"
              onChange={e => {
                const file = e.target.files?.[0] || null;
                setAnswers({ ...answers, [q.id]: file });
              }}
              required={q.is_required}
            />
            {answers[q.id] instanceof File && (
              <p className="text-sm text-gray-400 mt-1">
                Selected: {(answers[q.id] as File).name}
              </p>
            )}
          </div>
        )}
      </div>
    ));
  };

  return (
    <BasePageLayout
      pageTitle="Request a Booking"
      explanationText={"Fill and submit the form to request a booking from an infrastructure manager"}
      showDashboardButton
      alertMessage={message}
    >
      <Card className="card1 mb-8">
        <CardTitle className="text-2xl py-4">Book Infrastructures</CardTitle>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Infrastructure Selection */}
            <div className="space-y-2">
              {isLoading ? (
                <p>Loading available infrastructures...</p>
              ) : infrastructures.length === 0 ? (
                <p>No infrastructures available</p>
              ) : (
                <>
                  <p className="small-title">Select Infrastructure</p>
                  <Select
                    onValueChange={(value) => {
                      setSelectedInfrastructureId(Number(value));
                      setSelectedDate(undefined);
                      setSelectedTimeslotId(null);
                    }}
                    value={selectedInfrastructureId?.toString() || ""}
                    disabled={isLoading} // Disable when loading infrastructures
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
                </>
              )}
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

            {/* Dynamic question fields */}
            {questions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Additional Information</h3>
                {renderQuestionFields()}
              </div>
            )}

            {/* Submit button */}
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
    </BasePageLayout>
  );
};

export default BookTimeslot;