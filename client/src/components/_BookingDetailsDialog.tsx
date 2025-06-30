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
import { useTranslation } from 'react-i18next';

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

    const { t, i18n } = useTranslation()

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
                className={"!max-w-2xl !min-w-2xl overflow-y-scroll max-h-[90vh] card1 " + className}
                aria-describedby={undefined}
            >
                <DialogHeader>
                    <DialogTitle className='text-center text-3xl font-medium'>
                        {t('Booking Details', 'Booking Details')}
                        {/* Booking Details */}
                    </DialogTitle>
                </DialogHeader>
                {isLoading ? (
                    <div className="py-8 text-center">
                        <Loader className="h-8 w-8 animate-spin mx-auto mb-4" />
                        {/* <p>Loading booking details...</p> */}
                        <p dir='auto'>{t('Loading', { what: t('booking details') })}</p>
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
                    <div className="space-y-6 max-w-full overflow-hidden">
                        {/* Booking Summary */}
                        <div className="space-y-4 pb-5 text-center">
                            <h3 className="underlined-title">{t("General Information")}</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">

                                    <div className="flex items-start text-sm" dir={i18n.dir()}>
                                        <Briefcase className="h-4 w-4 mx-2 text-gray-400 mt-0.5" />
                                        <span dir='auto'>{details.booking.infrastructure_name}</span>
                                    </div>

                                    <div className="flex items-start text-sm" dir={i18n.dir()}>
                                        <MapPin className="h-4 w-4 mx-2 text-gray-400 mt-0.5" />
                                        <span dir='auto'>{details.booking.infrastructure_location || 'N/A'}</span>
                                    </div>
                                    <div className="flex items-center text-sm" dir={i18n.dir()}>
                                        <Calendar className="h-4 w-4 mx-2 text-gray-400" />
                                        <span dir='auto'>{formatDate(details.booking.booking_date, i18n.language)}</span>
                                    </div>

                                    <div className="flex items-center text-sm" dir={i18n.dir()}>
                                        <Clock className="h-4 w-4 mx-2 text-gray-400" />
                                        <span dir='auto'>
                                            {formatTimeString(details.booking.start_time)} - {formatTimeString(details.booking.end_time)}
                                        </span>
                                        <span>
                                            &nbsp;({calculateDuration(details.booking.start_time, details.booking.end_time)}&nbsp;{t("minutes", "minutes")})&nbsp;
                                        </span>
                                    </div>

                                    <div className="flex items-center text-sm" dir={i18n.dir()}>
                                        <User className="h-4 w-4 mx-2 text-gray-400" />
                                        <span dir='auto'>{details.booking.user_email}</span>
                                    </div>
                                </div>

                                <div className="space-y-3" dir='auto'>
                                    <div className="flex items-center text-sm">
                                        <span className="text-gray-400 mx-2">{t("Status", "Status")}:</span>
                                        <Badge className={getStatusColor(details.booking.status)}>
                                            {t(details.booking.status.charAt(0).toUpperCase() + details.booking.status.slice(1))}
                                        </Badge>
                                    </div>
                                    {details.booking.purpose && (
                                        <div className="break-words flex items-center text-sm" dir='auto'>
                                            <span className="text-gray-400 mx-2">{t("Purpose", "Purpose")}:</span>
                                            <TruncatedText
                                                text={details.booking.purpose}
                                                maxLength={150}
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        {/* Filter Question Answers */}
                        {details.answers && details.answers.length > 0 ? (
                            <div className="space-y-4">
                                <h3 className="underlined-title text-center">
                                    {t('User Answers For Filter-Questions', 'User Answers For Filter-Questions')}
                                    {/* User Answers For Filter-Questions */}
                                </h3>

                                <div className="pb-4 space-y-4">
                                    {details.answers.map((answer, index) => (
                                        <div
                                            key={answer.question_id}
                                            className={`pb-4 ${index < details.answers.length ? ' border-b border-gray-700/60' : ''}`}
                                            dir='auto'
                                        >
                                            <p dir='auto' className="font-medium text-lg text-center">{answer.question_text}</p>

                                            {answer.question_type === 'document' ? (
                                                answer.document_url ? (
                                                    <div className="flex items-center">
                                                        <Download className="h-4 w-4 mr-1" />
                                                        <span
                                                            onClick={async (e) => {
                                                                e.preventDefault();
                                                                try {
                                                                    await downloadBookingFile(details.booking.id, answer.question_id, answer.answer_text ?? undefined);
                                                                } catch (error) {
                                                                    alert('Failed to download the file.');
                                                                }
                                                            }}
                                                            className="text-blue-400 hover:underline cursor-pointer inline"
                                                        >
                                                            {answer.answer_text || 'Download file'}
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 text-sm mt-1">No file uploaded</span>
                                                )
                                            ) : (
                                                <TruncatedText
                                                    text={answer.answer_text}
                                                    maxLength={100}
                                                    placeholder={t("No answer provided")}
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
                                <p>
                                    {/* No additional information was provided for this booking. */}
                                    {t('noAddonInfo', 'No additional information was provided for this booking.')}
                                </p>

                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="py-8 text-center text-gray-400">
                        {/* <p>No booking details available</p> */}
                        <p>{t('No booking details available', 'No booking details available')}</p>
                    </div>
                )}

                <DialogFooter>
                    <Button onClick={onClose}>{t('Close', 'Close')}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default BookingDetailsDialog;