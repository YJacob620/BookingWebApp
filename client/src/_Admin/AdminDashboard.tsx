import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button.tsx";
import { LogOut, Calendar, Database, Users, HelpCircle } from "lucide-react";

import { useAdminAuth } from './useAdminAuth.tsx';
import { LOGIN } from '@/RoutePaths';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading } = useAdminAuth();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    const handleLogout = () => {
        localStorage.clear();
        navigate(LOGIN);
    };

    const menuItems = [
        {
            title: 'User Management',
            link: '/user-management',
            description: 'Manage users, assign roles, and control infrastructure access',
            icon: <Users className="h-6 w-6" />
        },
        {
            title: 'Infrastructures Management',
            link: '/infrastructure-management',
            description: 'Create or edit scientific infrastructures',
            icon: <Database className="h-6 w-6" />
        },
        {
            title: 'Bookings & Timeslots',
            link: '/booking-management',
            description: 'Manage bookings and available time slots',
            icon: <Calendar className="h-6 w-6" />
        }
    ];

    return (
        <Card className="general-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-end mb-6">
                    <Button
                        onClick={handleLogout}
                        className="bg-zinc-950 h-8 discard"
                    >
                        <LogOut className="h-4 w-4" />
                        Logout
                    </Button>
                </div>

                {/* Centered title */}
                <div className="text-center mb-2">
                    <h1 className="text-3xl font-bold text-gray-100">Admin Dashboard</h1>
                </div>

                <Card className="bg-transparent border-transparent shadow-none">
                    <CardContent className="pt-6">
                        <p className="explanation-text1">
                            Select a section below to manage different aspects of the system
                        </p>
                    </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.link}
                            className="block no-underline"
                        >
                            <Card className="card2">
                                <CardHeader>
                                    <CardTitle className="text-gray-100 text-2xl font-medium">
                                        {item.title}
                                    </CardTitle>
                                    <CardDescription className="text-gray-400 font-medium">
                                        {item.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardFooter className="mt-auto flex justify-center text-gray-100">
                                    {item.icon}
                                </CardFooter>
                            </Card>
                        </Link>
                    ))}
                </div>
            </div>
        </Card>
    );
};

export default AdminDashboard;