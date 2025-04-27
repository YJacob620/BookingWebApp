import { Link } from 'react-router-dom';
import { Card, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Calendar, Database, Users } from "lucide-react";
import * as RoutePaths from '@/RoutePaths';

import BasePageLayout from '@/components/_BasePageLayout';
import { useEffect, useState } from 'react';
import { getLocalUser, User } from '@/utils';
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
    const [user, setUser] = useState<User | null>();
    useEffect(() => {
        setUser(getLocalUser());
    }, []);

    const {t} = useTranslation()

    const menuItems = [
        {
            title: t('Users','Users'),
            link: RoutePaths.USER_MANAGEMENT,
            description:t('UsersDesc','Manage users, assign roles, and control infrastructure access') ,
            icon: <Users className="h-6 w-6" />
        },
        {
            title: t('Infrastructures'),
            link: RoutePaths.INFRASTRUCTURE_MANAGEMENT,
            description: t('adminDash.InfrastructuresDesc','Manage scientific infrastructures'),
            icon: <Database className="h-6 w-6" />
        },
        {
            title: t('Bookings & Timeslots'),
            link: RoutePaths.BOOKING_MANAGEMENT,
            description: t('adminDash.Book&TimeDesc','Manage booking requests and available time slots'),
            icon: <Calendar className="h-6 w-6" />
        }
    ];

    return (
        <BasePageLayout
            pageTitle={t('adminDash.title',"Admin Dashboard")}
            showLogoutButton
            explanationText={t('adminDash.explanation')}
            // {"Select a section below to manage different aspects of the system"}
            className={"w-170"}
        >
            <h2 className="text-xl font-semibold mb-5">{t('welcomeHeader',{name:user?.name || user?.email})}</h2>
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