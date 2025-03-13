import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { LogOut, Database } from "lucide-react";

import { useManagerAuth } from './useManagerAuth';
import { fetchMyInfrastructures, Infrastructure } from '@/_utils';
import { LOGIN } from '@/RoutePaths';
import EmailPreferencesToggle from '@/components/_EmailPreferencesToggle';


const ManagerDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading } = useManagerAuth();
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthorized) {
            getInfrastructures();
        }
    }, [isAuthorized]);

    const getInfrastructures = async () => {
        try {
            // Use the revised function that doesn't require user ID
            const data = await fetchMyInfrastructures();
            setInfrastructures(data);
        } catch (error) {
            console.error('Error fetching infrastructures:', error);
            setError('Failed to fetch your managed infrastructures');
        }
    };

    const handleLogout = () => {
        localStorage.clear();
        navigate(LOGIN);
    };

    if (isLoading) {
        return <div>Loading...</div>;
    }

    if (!isAuthorized) {
        return null;
    }

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

                <div className="text-center mb-2">
                    <h1 className="text-3xl font-bold text-gray-100">Infrastructure Manager Dashboard</h1>
                </div>

                <Card className="bg-transparent border-transparent shadow-none">
                    <CardContent className="pt-6">
                        <p className="explanation-text1">
                            Manage your assigned infrastructures, timeslots, and booking requests.
                        </p>
                    </CardContent>
                </Card>

                <EmailPreferencesToggle className="mt-6" />

                {error && (
                    <Alert className="alert-error mb-6">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {infrastructures.map((infra) => (
                        <Link
                            key={infra.id}
                            to={`/manager-bookings/${infra.id}`}
                            className="block no-underline"
                        >
                            <Card className="card2">
                                <CardContent className="p-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h2 className="text-xl font-semibold mb-2">{infra.name}</h2>
                                            <p className="text-sm text-gray-400">{infra.location || 'No location'}</p>
                                        </div>
                                        <Database className="h-6 w-6 text-blue-400" />
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
            </div>
        </Card>
    );
};

export default ManagerDashboard;