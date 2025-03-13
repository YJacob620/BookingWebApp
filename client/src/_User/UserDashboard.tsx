import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { LogOut, CalendarPlus } from "lucide-react";
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
  fetchUserBookings
} from '@/_utils';
import { LOGIN } from '@/RoutePaths';
import EmailPreferencesToggle from '@/components/_EmailPreferencesToggle';

const UserDashboard = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<{ name: string, email: string } | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const userString = localStorage.getItem('user');
      const token = localStorage.getItem('token');

      if (!userString || !token) {
        navigate(LOGIN);
        return;
      }

      try {
        setUser(JSON.parse(userString));
        getRecentBookings();
      } catch (err) {
        console.error('Error parsing user data:', err);
        navigate(LOGIN);
      }
    };

    checkAuth();
  }, [navigate]);

  const getRecentBookings = async () => {
    try {
      setIsLoading(true);
      const data = await fetchUserBookings();
      setBookings(data);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Unable to load your bookings. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate(LOGIN);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen general-container flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Card className="general-container">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Logout button in top-right corner */}
        <div className="flex justify-end mb-6">
          <Button
            onClick={handleLogout}
            className="back-button discard"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>

        {/* Centered title */}
        <div className="text-center mb-2">
          <h1 className="text-3xl font-bold text-gray-100">User Dashboard</h1>
        </div>

        {/* Welcome section */}
        <Card className="bg-transparent border-transparent shadow-none mb-6">
          <CardContent className="pt-6">
            <h2 className="text-xl font-semibold mb-2">Welcome, {user?.name || user?.email}</h2>
            <p className="explanation-text1">
              You can create a new booking or view your existing ones below.
            </p>
          </CardContent>
        </Card>

        {/* Quick actions */}
        <EmailPreferencesToggle />
        <div className="mb-8">
          <Link to="/create-booking">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <CalendarPlus className="mr-2 h-4 w-4" />
              New Booking
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
            <CardTitle>Your Recent Bookings</CardTitle>
            <CardDescription className="explanation-text1">
              Here are your most recent booking requests and their current status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {bookings.length > 0 ? (
              <div className="table-wrapper">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead>Infrastructure</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Status</TableHead>
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
                You don't have any bookings yet.
              </p>
            )}

            {bookings.length > 0 && (
              <div className="mt-4 flex justify-center">
                <Link to="/booking-history">
                  <Button>View And Manage All Bookings</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Card>
  );
};

export default UserDashboard;
