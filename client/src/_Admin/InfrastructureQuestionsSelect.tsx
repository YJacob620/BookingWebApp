import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { useAdminAuth } from './useAdminAuth';
import { fetchInfrastructures, Infrastructure } from '@/_utils';
import { ADMIN_DASHBOARD } from '@/RoutePaths';

const InfrastructureQuestionsSelect: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading: authLoading } = useAdminAuth();
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isAuthorized) {
            loadInfrastructures();
        }
    }, [isAuthorized]);

    const loadInfrastructures = async () => {
        try {
            setIsLoading(true);
            const data = await fetchInfrastructures();
            setInfrastructures(data);
        } catch (error) {
            console.error('Error loading infrastructures:', error);
            setError('Failed to load infrastructures');
        } finally {
            setIsLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen general-container flex items-center justify-center">
                <div className="text-xl">Loading...</div>
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <Card className="general-container">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-start mb-6">
                    <Button
                        onClick={() => navigate(ADMIN_DASHBOARD)}
                        className="back-button"
                    >
                        <ArrowLeftCircle className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h1>Manage Infrastructure Questions</h1>
                </div>

                {error && (
                    <Alert className="mb-6 alert-error">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <Card className="card1">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Select Infrastructure to Manage Questions</h2>

                        {isLoading ? (
                            <div className="text-center py-8">Loading infrastructures...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {infrastructures.map(infra => (
                                    <Card
                                        key={infra.id}
                                        className="card2 cursor-pointer hover:border-white transition-colors"
                                        onClick={() => navigate(`/infrastructure-questions/${infra.id}`)}
                                    >
                                        <CardContent className="p-4">
                                            <h3 className="text-lg font-medium">{infra.name}</h3>
                                            {infra.location && (
                                                <p className="text-sm text-gray-400">{infra.location}</p>
                                            )}
                                            <div className="mt-2">
                                                <span className={`px-2 py-1 text-xs rounded-full ${infra.is_active ? 'bg-green-800 text-green-100' : 'bg-red-800 text-red-100'}`}>
                                                    {infra.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}

                                {infrastructures.length === 0 && (
                                    <div className="col-span-full text-center py-8 text-gray-400">
                                        No infrastructures found. Please create infrastructures first.
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Card>
    );
};

export default InfrastructureQuestionsSelect;