import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Settings, CalendarRange } from "lucide-react";

import { fetchMyInfrastructures, Infrastructure, Message } from '@/_utils';
import { MANAGER_INFRASTRUCTURE_MANAGEMENT, getManagerBookingsPath } from '@/RoutePaths';
import EmailPreferencesToggle from '@/components/_EmailPreferencesToggle';
import ProtectedPageLayout from '@/components/_ProtectedPageLayout';


const ManagerDashboard: React.FC = () => {
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [message, setMessage] = useState<Message | null>(null);


    useEffect(() => {
        getInfrastructures();
    }, []);

    const getInfrastructures = async () => {
        try {
            const data = await fetchMyInfrastructures();
            setInfrastructures(data);
        } catch (error) {
            console.error('Error fetching infrastructures:', error);
            setMessage({
                type: 'error',
                text: 'Failed to fetch your managed infrastructures'
            });
        }
    };

    return (
        <ProtectedPageLayout
            pageTitle="Infrastructure Manager Dashboard"
            explanationText="Manage your assigned infrastructures, timeslots, and booking requests."
            showLogoutButton
            alertMessage={message}
        >
            <EmailPreferencesToggle />
            {/* Infrastructure Management Button - Links to shared page */}
            <div className="mb-6 mt-6">
                <Link to={MANAGER_INFRASTRUCTURE_MANAGEMENT}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Settings className="mr-2 h-4 w-4" />
                        Manage Infrastructures & Questions
                    </Button>
                </Link>
            </div>

            <h2 className="text-xl font-semibold">Your Assigned Infrastructures</h2>
            <p className='explanation-text1 mb-4'>Click on one to manage its bookings and timeslots</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {infrastructures.map((infra) => (
                    <Link
                        key={infra.id}
                        to={getManagerBookingsPath(infra.id)}
                        className="block no-underline"
                    >
                        <Card className="card2">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h2 className="text-xl font-semibold mb-2">{infra.name}</h2>
                                        <p className="text-sm text-gray-400">{infra.location || 'No location'}</p>
                                    </div>
                                    <div className="flex">
                                        <Database className="h-6 w-6 text-blue-400 mr-2" />
                                        <CalendarRange className="h-6 w-6 text-green-400" />
                                    </div>
                                </div>
                                <p className="mt-4 text-sm text-gray-300 line-clamp-2">{infra.description}</p>
                                <div className="mt-4">
                                    <span className={`px-2 py-1 rounded ${infra.is_active ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
                                        {infra.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            {infrastructures.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                    You don't have any assigned infrastructures.
                </div>
            )}
        </ProtectedPageLayout>
    );
};

export default ManagerDashboard;