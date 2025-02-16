import { useNavigate, Link } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, Calendar, Database } from "lucide-react";

const AdminDashboard = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading } = useAdminAuth();

    const handleLogout = () => {
        localStorage.clear();
        navigate('/login');
    };

    const menuItems = [
        {
            title: 'Infrastructures Management',
            link: '/infrastructure-management',
            description: 'Create or edit scientific infrastructures',
            icon: <Database className="h-6 w-6" />
        },
        {
            title: 'Bookings Management',
            link: '/booking-management',
            description: 'View and manage all bookings',
            icon: <Calendar className="h-6 w-6" />
        },
        {
            title: 'Time-slots Management',
            link: '/time-slots-management',
            description: 'Manage booking time slots',
            icon: <Settings className="h-6 w-6" />
        }
    ];

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

    return (
        <Card className="general-container">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Logout button in top-right corner */}
                <div className="flex justify-end mb-6">
                    <Button
                        variant="destructive"
                        onClick={handleLogout}
                        className="gap-2 bg-red-600 hover:!border-red-700"
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

                <div className="grid grid-cols-1 gap-4">
                    {menuItems.map((item, index) => (
                        <Link
                            key={index}
                            to={item.link}
                            className="block no-underline"
                        >
                            <Card className="card1 card1-hover">
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