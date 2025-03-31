import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Database } from "lucide-react";
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import * as RoutePaths from '@/RoutePaths';
import EmailPreferencesToggle from '@/components/_EmailPreferencesToggle';
import BasePageLayout from '@/components/_BasePageLayout';
import { getLocalUser, User } from '@/utils';

const ManagerDashboard = () => {
    const [user, setUser] = useState<User | null>();
    useEffect(() => {
        setUser(getLocalUser());
    }, []);

    const menuItems = [
        {
            title: 'Infrastructures',
            link: RoutePaths.MANAGER_INFRASTRUCTURE_MANAGEMENT,
            description: 'Manage your assigned infrastructures',
            icon: <Database className="h-6 w-6" />
        },
        {
            title: 'Bookings & Timeslots',
            link: RoutePaths.BOOKING_MANAGEMENT,
            description: 'Manage booking requests and available time slots for your assigned infrastructures',
            icon: <Calendar className="h-6 w-6" />
        },
    ];

    return (
        <BasePageLayout
            pageTitle="Infrastructure-Manager Dashboard"
            showLogoutButton
            explanationText={"Manage your assigned infrastructures and booking requests"}
            className={"w-170"}
        >
            <h2 className="text-xl font-semibold mb-5">Welcome, {user?.name || user?.email}</h2>
            <EmailPreferencesToggle className="mb-6" />

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

export default ManagerDashboard;