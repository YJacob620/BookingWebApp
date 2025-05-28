import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CalendarPlus } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  formatDate,
  formatTimeString,
  getStatusColor,
  BookingEntry,
  fetchUserBookings,
  User,
  getLocalUser
} from '@/utils';
import { BOOKING_HISTORY, CREATE_BOOKING } from '@/RoutePaths';
import EmailPreferencesToggle from '@/components/_EmailPreferencesToggle';
import BasePageLayout from '@/components/_BasePageLayout';
import { useTranslation } from 'react-i18next';


const UserDashboard = () => {
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>();
  const { t, i18n } = useTranslation();


  useEffect(() => {
    setUser(getLocalUser());
    getRecentBookings();
  }, []);

  const getRecentBookings = async () => {
    try {
      setIsLoading(true);
      const data = await fetchUserBookings(true);
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Unable to load your bookings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen general-container flex items-center justify-center">
        <div className="text-xl">{t('Loading', { what: ' ' })}</div>
      </div>
    );
  }

  return (
    <BasePageLayout
      pageTitle={t('userDashboard.title')}
      explanationText={t('userDashboard.explaination')}
      showLogoutButton
    >
      <h2 dir={i18n.dir()} className="text-xl font-semibold mb-5">{t('welcomeHeader', { name: user?.name || user?.email })}</h2>

      <EmailPreferencesToggle />
      <div className="my-8">
        <Link to={CREATE_BOOKING}>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <CalendarPlus className="mr-2 h-4 w-4" />
            {t('userDashboard.New Booking')}
          </Button>
        </Link>
      </div>

      {/* Error alert */}
      {error && (
        <Alert className="mb-6 alert-error">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Bookings table */}
      <Card className="card1">
        <CardHeader>
          <CardTitle>{t('userDashboard.recentBookTitle', 'Your Recent Bookings')}</CardTitle>
          <CardDescription className="explanation-text1">
            {t('userDashboard.recentBookDesc')}
            {/* Here are your most recent booking requests and their current status */}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {bookings.length > 0 ? (
            <div className="table-wrapper">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-700">
                    <TableHead>{t("Infrastructure")}</TableHead>
                    <TableHead>{t('Date')}</TableHead>
                    <TableHead>{t("Time")}</TableHead>
                    <TableHead>{t("Location")}</TableHead>
                    <TableHead>{t("Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.map((booking) => (
                    <TableRow
                      key={booking.id}
                      className="border-gray-700 def-hover"
                    >
                      <TableCell className="font-medium">
                        {booking.infrastructure_name}
                      </TableCell>
                      <TableCell className="text-center">
                        {formatDate(booking.booking_date)}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">
                        {formatTimeString(booking.start_time)} - {formatTimeString(booking.end_time)}
                      </TableCell>
                      <TableCell className="text-center">
                        {booking.infrastructure_location || 'N/A'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-center py-8 explanation-text1">
              {t('userDashboard.noBookExplain', "You don't have any bookings yet.")}
            </p>
          )}

          {bookings.length > 0 && (
            <div className="mt-4 flex justify-center">
              <Link to={BOOKING_HISTORY}>
                <Button>{t('userDashboard.bookHistLink', 'View And Manage All Bookings')}</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </BasePageLayout>
  );
};

export default UserDashboard;
