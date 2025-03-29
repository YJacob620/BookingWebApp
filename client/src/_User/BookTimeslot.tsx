import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarCheck, Mail, ArrowRight } from "lucide-react";
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
import { Input } from '@/components/ui/input';

import {
  Infrastructure,
  BookingEntry,
  // fetchInfrastructures,
  bookTimeslot,
  fetchInfrastAvailTimeslots,
  bookTimeslotWithAnswers,
  fetchInfrastructureQuestions,
  FilterQuestionData,
  FilterQuestionsAnswersType,
  Message,
  initiateGuestBooking
} from '@/_utils';
import { LOGIN } from '@/RoutePaths';
import BasePageLayout from '@/components/_BasePageLayout';
import InfrastructureSelector from '@/components/_InfrastructureSelector';

type UserAnswersMap = Record<number, FilterQuestionsAnswersType>;

const BookTimeslot = () => {
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isProcessingGuestBooking, setIsProcessingGuestBooking] = useState(false);
  const [allTimeslots, setAllTimeslots] = useState<BookingEntry[]>([]);
  const [selectedDateTimeslots, setDateTimeslots] = useState<BookingEntry[]>([]);
  const [isLoadingTimeslots, setIsLoadingTimeslots] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedInfrastructure, setSelectedInfrastructure] = useState<Infrastructure | null>(null);
  const [selectedTimeslotId, setSelectedTimeslotId] = useState<number | null>(null);
  const [purpose, setPurpose] = useState<string>('');
  const [message, setMessage] = useState<Message | null>(null);
  const [questions, setQuestions] = useState<FilterQuestionData[]>([]);
  const [answers, setAnswers] = useState<UserAnswersMap>({});
  const [isFormValid, setIsFormValid] = useState(false);

  // Guest-specific state
  const [searchParams] = useSearchParams();
  const isGuestMode = searchParams.get('guest') === 'true';
  const [guestEmail, setGuestEmail] = useState<string>('');
  const [showGuestEmailForm, setShowGuestEmailForm] = useState(false);

  // Fetch all available timeslots and filter-questions for the selected infrastructure
  useEffect(() => {
    if (selectedInfrastructure) {
      fetchAllAvailableTimeslots();
      fetchInfrastructureQuestions(selectedInfrastructure.id)
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
      setIsLoading(false);
    } else {
      setAllTimeslots([]);
      setDateTimeslots([]);
      setIsLoading(true);
    }
  }, [selectedInfrastructure]);

  // Filter timeslots for the selected date
  useEffect(() => {
    if (selectedDate && allTimeslots.length > 0) {
      const selectedDay = startOfDay(selectedDate).getTime();

      const filtered = allTimeslots.filter(slot => {
        const slotDay = startOfDay(slot.booking_date).getTime();
        return slotDay === selectedDay;
      });

      setDateTimeslots(filtered);
    } else {
      setDateTimeslots([]);
    }
  }, [selectedDate, allTimeslots]);

  // Validate form whenever dependencies change
  useEffect(() => {
    validateForm();
  }, [selectedTimeslotId, answers, questions]);

  // Form validation function to check all required fields
  const validateForm = () => {
    // Basic form validation - must have a timeslot selected
    if (!selectedTimeslotId) {
      setIsFormValid(false);
      return;
    }

    // If no questions or no required questions, form is valid
    if (questions.length === 0) {
      setIsFormValid(true);
      return;
    }

    // Check each required question for a valid answer
    for (const q of questions.filter(q => q.is_required)) {
      const answer = answers[q.id];
      let isAnswerValid = false;

      switch (q.question_type) {
        case 'text':
        case 'dropdown':
          // For text/dropdown, must be non-empty string
          isAnswerValid = typeof answer === 'string' && answer.trim() !== '';
          break;

        case 'number':
          // For numbers, must be a number or a non-empty string
          isAnswerValid =
            (typeof answer === 'number' && !isNaN(answer)) ||
            (typeof answer === 'string' && answer.trim() !== '');
          break;

        case 'document':
          // For documents, must be a File object
          isAnswerValid = answer instanceof File;
          break;

        default:
          // Unknown type, consider it missing
          isAnswerValid = false;
      }

      if (!isAnswerValid) {
        setIsFormValid(false);
        return;
      }
    }

    // If we get here, all required fields are valid
    setIsFormValid(true);
  };

  const fetchAllAvailableTimeslots = async () => {
    if (!selectedInfrastructure) return;

    try {
      setIsLoadingTimeslots(true);
      const data = await fetchInfrastAvailTimeslots(selectedInfrastructure.id);
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

  // Handler for when a guest wants to request a booking
  const handleGuestBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedTimeslotId || !selectedInfrastructure) {
      setMessage({ type: 'error', text: 'Please select a valid infrastructure and timeslot' });
      return;
    }

    if (!guestEmail.trim()) {
      setMessage({ type: 'error', text: 'Please enter your email address' });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address' });
      return;
    }

    setIsProcessingGuestBooking(true);
    setMessage(null);

    try {
      // Prepare answers for API in the desired format
      const formattedAnswers: Record<string, any> = {};
      if (questions.length > 0) {
        Object.entries(answers).forEach(([questionId, value]) => {
          // For simplicity, we're only handling text answers for guests
          if (value !== null && typeof value !== 'object') {
            formattedAnswers[questionId] = value;
          }
        });
      }

      // Call the API function instead of using fetch directly
      const result = await initiateGuestBooking(
        guestEmail,
        selectedInfrastructure.id,
        selectedTimeslotId,
        purpose,
        formattedAnswers
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: result.message
        });

        // Reset form
        setSelectedTimeslotId(null);
        setPurpose('');
        setSelectedDate(undefined);
        setShowGuestEmailForm(false);

        // Reset answers
        const initialAnswers: UserAnswersMap = {};
        questions.forEach(q => {
          initialAnswers[q.id] = q.question_type === 'document' ? null : '';
        });
        setAnswers(initialAnswers);

        // Redirect to login page after a delay
        setTimeout(() => {
          navigate(LOGIN);
        }, 5000);
      } else {
        setMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch (error) {
      console.error('Error processing guest booking:', error);
      setMessage({
        type: 'error',
        text: error instanceof Error ? error.message : 'An error occurred while processing your booking'
      });
    } finally {
      setIsProcessingGuestBooking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // e.preventDefault();

    if (!selectedTimeslotId) {
      setMessage({
        type: 'error',
        text: 'Please select a timeslot'
      });
      return;
    }

    // For guest mode, show email form instead of proceeding directly
    if (isGuestMode) {
      setShowGuestEmailForm(true);
      return;
    }

    // Regular booking flow for authenticated users
    try {
      setIsLoading(true);

      // Check if we have any file uploads
      const hasFileUploads = Object.values(answers).some(answer => answer instanceof File);

      if (!hasFileUploads && questions.length === 0) {
        // Simple case: No file uploads and no questions - use the simpler JSON API
        await bookTimeslot({
          timeslot_id: selectedTimeslotId,
          purpose: purpose || ''
        });
      } else {
        // We have questions or file uploads - use FormData
        const formData = new FormData();

        // Add timeslot_id as a string - CRITICAL FOR SERVER
        formData.append('timeslot_id', selectedTimeslotId.toString());
        formData.append('purpose', purpose || '');

        // Process answers
        if (questions.length > 0) {
          // Create a clean object for JSON serialization
          const answersForJson: Record<string, any> = {};

          Object.entries(answers).forEach(([questionId, answer]) => {
            if (answer instanceof File) {
              // Handle file upload
              const fieldName = `file_${questionId}`;
              formData.append(fieldName, answer);
              answersForJson[questionId] = { type: 'file', fieldName };
            } else if (answer !== null && answer !== undefined) {
              // Handle text answers
              formData.append(`answer_${questionId}`, answer.toString());
              answersForJson[questionId] = { type: 'text', value: answer.toString() };
            }
          });

          // Add structured answers as JSON
          formData.append('answersJSON', JSON.stringify(answersForJson));
        }
        await bookTimeslotWithAnswers(formData);
      }

      // Success message
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
      // setTimeout(() => {
      //   navigate('/booking-history');
      // }, 3000);

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
    if (!selectedInfrastructure || allTimeslots.length === 0) return true;

    // Disable dates in the past
    const today = startOfDay(new Date());
    if (isBefore(date, today)) return true;

    // If we're still loading timeslots, disable future dates
    if (isLoadingTimeslots) return true;

    const isAvailable = availableDates.some(d => d.getTime() === date.getTime());
    return !isAvailable;
  };

  // Handle infrastructure selection from the InfrastructureSelector
  const handleInfrastructureSelected = (infrastructure: Infrastructure) => {
    setSelectedInfrastructure(infrastructure);
  };

  // Render dynamic question fields
  const renderQuestionFields = () => {
    return questions.map(q => (
      <div key={q.id} className="space-y-2">
        <p className="small-title">
          {q.question_text}
          {q.is_required == true && <span className="text-red-500 ml-1">*</span>}
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
      explanationText={isGuestMode
        ? "As a guest, you can request a booking without an account, but limited to one request per day."
        : "Fill and submit the form to request a booking"}
      showDashboardButton={!isGuestMode}
      alertMessage={message}
    >
      {showGuestEmailForm ? (
        <Card className="card1 max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="flex justify-center mb-4">
              <Mail className="h-8 w-8 text-blue-500 mr-3" />
              <h2 className="text-xl font-bold">Confirm Your Email</h2>
            </div>

            <p className="mb-4 explanation-text1">
              Please enter your email address. You'll receive a confirmation link to finalize your booking.
            </p>

            <form onSubmit={handleGuestBooking} className="space-y-4">
              <div>
                <label className="block mb-1">Email Address</label>
                <Input
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                />
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  onClick={() => setShowGuestEmailForm(false)}
                  disabled={isProcessingGuestBooking}
                >
                  Back
                </Button>

                <Button
                  type="submit"
                  className="flex-1"
                  disabled={isProcessingGuestBooking || !guestEmail}
                >
                  {isProcessingGuestBooking ?
                    'Processing...' :
                    'Send Confirmation Email'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : (
        <Card className="card1 mb-8">
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Infrastructure Selection */}
              <div className="space-y-1">
                <p className="mt-2">Select Infrastructure</p>
                <InfrastructureSelector
                  onSelectInfrastructure={handleInfrastructureSelected}
                  onError={(errorMsg) => setMessage({ type: 'error', text: errorMsg })}
                />
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
                {!isLoadingTimeslots && selectedInfrastructure && availableDates.length === 0 && (
                  <p className="text-sm text-amber-500">No available timeslots for this infrastructure</p>
                )}
              </div>

              {/* Timeslot Selection */}
              <div className="space-y-2">
                <p className="small-title">Select Timeslot</p>
                <Select
                  onValueChange={(value) => setSelectedTimeslotId(Number(value))}
                  value={selectedTimeslotId?.toString() || ""}
                  disabled={selectedDateTimeslots.length === 0 || !selectedDate}
                >
                  <SelectTrigger id="timeslot">
                    <SelectValue placeholder={
                      !selectedInfrastructure
                        ? "Select infrastructure first" : !selectedDate
                          ? "Select a date first" : selectedDateTimeslots.length === 0
                            ? "No available timeslots for this date" : "Select a timeslot"
                    } />
                  </SelectTrigger>
                  <SelectContent className="card1">
                    {selectedDateTimeslots.map((slot) => (
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

              {/* Submit button - updated for guest mode */}
              {isGuestMode && (
                <Alert className="bg-gray-800 border border-gray-700">
                  <AlertDescription>
                    <p>As a guest, after filling and submitting this form:</p>
                    <p>&nbsp;&nbsp;&nbsp;1. You'll be asked for your email address.</p>
                    <p>&nbsp;&nbsp;&nbsp;2. We'll send you an email with a confirmation link.</p>
                    <p>&nbsp;&nbsp;&nbsp;3. Click the link to finalize your booking request.</p>
                  </AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <span className="mr-2">Loading...</span>
                  </>
                ) : (
                  isGuestMode ? (
                    <>
                      Continue to Verification
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  ) : (
                    'Submit Booking Request'
                  )
                )}
              </Button>


            </form>
          </CardContent>
        </Card>
      )}
    </BasePageLayout>
  );
};

export default BookTimeslot;