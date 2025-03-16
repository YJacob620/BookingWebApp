import { Link } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, Database, Users } from "lucide-react";

import BasePageLayout from '@/components/_ProtectedPageLayout';

const AdminDashboard = () => {
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
        <BasePageLayout
            pageTitle="Admin Dashboard"
            showLogoutButton
            explanationText={"Select a section below to manage different aspects of the system"}
        >
            <div className="grid grid-cols-1 md:grid-cols-1 gap-4 min-w-120">
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
        </BasePageLayout>
    );
};

export default AdminDashboard;