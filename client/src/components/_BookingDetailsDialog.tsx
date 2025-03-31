import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Calendar,
    Clock,
    User,
    Briefcase,
    MapPin,
    Download,
    Loader,
    RefreshCw,
} from 'lucide-react';

import {
    fetchBookingDetails,
    BookingDetails,
    getStatusColor,
    formatDate,
    formatTimeString,
    calculateDuration,
    downloadBookingFile
} from '@/utils';
import TruncatedText from '@/components/_TruncatedText';
import { DialogTitle } from '@radix-ui/react-dialog';

interface BookingDetailsDialogProps {
    bookingId: number | null;
    isOpen: boolean;
    onClose: () => void;
    className?: string;
}

const BookingDetailsDialog: React.FC<BookingDetailsDialogProps> = ({
    bookingId,
    isOpen,
    onClose,
    className
}) => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [details, setDetails] = useState<BookingDetails | null>(null);

    // Fetch booking details when the dialog opens and bookingId changes
    useEffect(() => {
        if (isOpen && bookingId) {
            fetchDetails();
        } else if (!isOpen) {
            // Reset state when dialog closes
            setDetails(null);
            setError(null);
        }
    }, [isOpen, bookingId]);

    const fetchDetails = async () => {
        if (!bookingId) return;

        setIsLoading(true);
        setError(null);

        try {
            const data = await fetchBookingDetails(bookingId);
            setDetails(data);
        } catch (err) {
            console.error('Error fetching booking details:', err);
            setError('Failed to load booking details. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={className + " !max-w-2xl overflow-y-scroll max-h-[90vh] card1 "}
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle className='text-center text-3xl font-medium'>Booking Details</DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="py-8 text-center">
                        <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
                        <p>Loading booking details...</p>
                    </div>
                ) : error ? (
                    <div className="py-8 text-center text-red-500">
                        <p>{error}</p>
                        <Button onClick={fetchDetails} className="mt-4" variant="outline">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retry
                        </Button>
                    </div>
                ) : details && details.booking ? (
                    <div className="space-y-6">
                        {/* Booking Summary */}
                        <div className="space-y-4 pb-5">
                            <h3 className="underlined-title">Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">

                                    <div className="flex items-start text-sm">
                                        <Briefcase className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                        <span>{details.booking.infrastructure_name}</span>
                                    </div>

                                    <div className="flex items-start text-sm">
                                        <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                                        <span>{details.booking.infrastructure_location || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center text-sm">
                                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>{formatDate(details.booking.booking_date)}</span>
                                    </div>

                                    <div className="flex items-center text-sm">
                                        <Clock className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>
                                            {formatTimeString(details.booking.start_time)} - {formatTimeString(details.booking.end_time)}
                                        </span>
                                        <span>&nbsp;&nbsp;({calculateDuration(details.booking.start_time, details.booking.end_time)} minutes)</span>
                                    </div>

                                    <div className="flex items-center text-sm">
                                        <User className="h-4 w-4 mr-2 text-gray-400" />
                                        <span>
                                            {details.booking.user_email}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center text-sm">
                                        <span className="text-gray-400 mr-2">Status:</span>
                                        <Badge className={getStatusColor(details.booking.status)}>
                                            {details.booking.status.charAt(0).toUpperCase() + details.booking.status.slice(1)}
                                        </Badge>
                                    </div>
                                    {details.booking.purpose && (
                                        <div className=" items-start text-sm">
                                            <span className="text-gray-400 mr-2">Purpose:</span>
                                            <TruncatedText
                                                text={details.booking.purpose}
                                                maxLength={250}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Filter Question Answers */}
                        {details.answers && details.answers.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="underlined-title">
                                    User Answers For Filter-Questions
                                </h3>

                                <div className="pb-4 space-y-4">
                                    {details.answers.map((answer, index) => (
                                        <div
                                            key={answer.question_id}
                                            className={`pb-4 ${index < details.answers.length ? ' border-b border-gray-700/60' : ''}`}>
                                            <p className="font-medium text-lg text-center">{answer.question_text}</p>

                                            {answer.question_type === 'document' ? (
                                                answer.document_url ? (
                                                    <div
                                                        onClick={async (e) => {
                                                            e.preventDefault();
                                                            try {
                                                                await downloadBookingFile(details.booking.id, answer.question_id, answer.answer_text ?? undefined);
                                                            } catch (error) {
                                                                alert('Failed to download the file.');
                                                            }
                                                        }}
                                                        className="flex items-center text-blue-400 hover:underline mt-1 cursor-pointer"
                                                    >
                                                        <Download className="h-4 w-4 mr-1" />
                                                        {answer.answer_text || 'Download file'}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm mt-1">No file uploaded</span>
                                                )
                                            ) : (
                                                <TruncatedText
                                                    text={answer.answer_text}
                                                    maxLength={100}
                                                    placeholder="No answer provided"
                                                    className="text-gray-200 text-sm mt-1"
                                                    contentClassName="max-w-md"
                                                    preserveNewlines={true}
                                                />

                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : details.booking.booking_type === 'booking' ? (
                            <div className="text-center py-4 text-gray-400 border-t border-gray-700">
                                <p>No additional information was provided for this booking.</p>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="py-8 text-center text-gray-400">
                        <p>No booking details available</p>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BookingDetailsDialog;