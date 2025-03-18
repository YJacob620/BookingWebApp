import { Link } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, Database, Users } from "lucide-react";
import * as RoutePaths from '@/RoutePaths';

import BasePageLayout from '@/components/_BasePageLayout';

const AdminDashboard = () => {
    const menuItems = [
        {
            title: 'Users',
            link: RoutePaths.USER_MANAGEMENT,
            description: 'Manage users, assign roles, and control infrastructure access',
            icon: <Users className="h-6 w-6" />
        },
        {
            title: 'Infrastructures',
            link: RoutePaths.INFRASTRUCTURE_MANAGEMENT,
            description: 'Manage scientific infrastructures',
            icon: <Database className="h-6 w-6" />
        },
        {
            title: 'Bookings & Timeslots',
            link: RoutePaths.BOOKING_MANAGEMENT,
            description: 'Manage booking requests and available time slots',
            icon: <Calendar className="h-6 w-6" />
        }
    ];

    return (
        <BasePageLayout
            pageTitle="Admin Dashboard"
            showLogoutButton
            explanationText={"Select a section below to manage different aspects of the system"}
            className={"w-170"}
        >
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
        </BasePageLayout>
    );
};

export default AdminDashboard;