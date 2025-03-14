import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle, Plus, Database, HelpCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import InfrastructureManagementForm from './InfrastructureManagementForm';
import InfrastructureManagementList from './InfrastructureManagementList';
import InfrastructureQuestionsManager from './InfrastructureManagementQuestions';
import { useAdminAuth } from './useAdminAuth';
import { useManagerAuth } from '@/_Manager/useManagerAuth';

// Import types and API utilities
import {
    fetchInfrastructures,
    fetchMyInfrastructures,
    createOrUpdateInfrastructure,
    toggleInfrastructureStatus,
    Infrastructure,
    Message,
    InfrastFormData
} from '@/_utils';
import { ADMIN_DASHBOARD, MANAGER_DASHBOARD } from '@/RoutePaths';


const InfrastructureManagement: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized: isAuthorizedAdmin, isLoading: adminLoading } = useAdminAuth();
    const { isAuthorized: isAuthorizedManager, isLoading: managerLoading } = useManagerAuth();

    // Remove manual checkUserRole function and related state
    // Instead, use this pattern:
    const [isAdmin, setIsAdmin] = useState(false);
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<Message>({ type: '', text: '' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingInfrastructure, setEditingInfrastructure] = useState<Infrastructure | null>(null);
    const [activeTab, setActiveTab] = useState<string>("list");
    const [selectedInfrastructure, setSelectedInfrastructure] = useState<Infrastructure | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Determine user role once when component mounts 
    useEffect(() => {
        if (isAuthorizedAdmin) {
            getInfrastructures();
        } else {
            console.error("Auth problem");
        }
    }, [isAuthorizedAdmin, refreshTrigger]);

    const getInfrastructures = async () => {
        try {
            setIsLoading(true);
            const data = isAdmin
                ? await fetchInfrastructures()
                : await fetchMyInfrastructures();
            setInfrastructures(data);
        } catch (error) {
            console.error('Error fetching infrastructures:', error);
            setMessage({ type: 'error', text: 'Failed to fetch infrastructures' });
        } finally {
            setIsLoading(false);
        }
    };

    // Create or update infrastructure (admin only)
    const handleSubmit = async (formData: InfrastFormData) => {
        // Only allow admins to create/update infrastructures
        if (!isAdmin) {
            setMessage({
                type: 'error',
                text: 'You do not have permission to perform this action'
            });
            return;
        }

        try {
            await createOrUpdateInfrastructure(
                formData,
                isEditMode && editingInfrastructure ? editingInfrastructure.id : undefined
            );

            setMessage({
                type: 'success',
                text: `Infrastructure ${isEditMode ? 'updated' : 'added'} successfully!`
            });

            if (isEditMode) {
                handleCancelEdit();
            }

            getInfrastructures();
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} infrastructure:`, error);
            setMessage({
                type: 'error',
                text: error instanceof Error
                    ? error.message
                    : `An error occurred while ${isEditMode ? 'updating' : 'adding'} the infrastructure`
            });
        }
    };

    const handleEdit = (infrastructure: Infrastructure) => {
        // Only allow admins to edit infrastructure details
        if (!isAdmin && activeTab !== "questions") {
            setMessage({
                type: 'error',
                text: 'You do not have permission to edit infrastructure details'
            });
            return;
        }

        setIsEditMode(true);
        setEditingInfrastructure(infrastructure);
        setActiveTab("form");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditingInfrastructure(null);
    };

    // Toggle infrastructure status (admin only)
    const toggleStatus = async (id: number, currentStatus: boolean) => {
        // Only allow admins to toggle infrastructure status
        if (!isAdmin) {
            setMessage({
                type: 'error',
                text: 'You do not have permission to change infrastructure status'
            });
            return;
        }

        if (!confirm(currentStatus
            ? 'Warning: Setting an infrastructure as inactive will not cancel existing bookings. Continue?'
            : 'Set this infrastructure as active?')) {
            return;
        }

        try {
            await toggleInfrastructureStatus(id);
            setMessage({ type: 'success', text: 'Status updated successfully!' });
            getInfrastructures();
        } catch (error) {
            console.error('Error toggling status:', error);
            setMessage({
                type: 'error',
                text: error instanceof Error
                    ? error.message
                    : 'An error occurred while updating the status'
            });
        }
    };

    // Handle infrastructure selection for questions management
    const handleManageQuestions = (infrastructure: Infrastructure) => {
        setSelectedInfrastructure(infrastructure);
        setActiveTab("questions");
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <Card className="general-container w-210">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-start mb-6">
                    <Button
                        onClick={() => navigate(
                            isAuthorizedAdmin ? ADMIN_DASHBOARD : isAuthorizedManager ? MANAGER_DASHBOARD : 'ERROR')}
                        className="back-button"
                    >
                        <ArrowLeftCircle className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h1>Infrastructure Management</h1>
                </div>

                {message.text && (
                    <Alert
                        variant={message.type === 'success' ? 'default' : 'destructive'}
                        className={`mb-6 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
                    >
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="w-full mb-6"
                >
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="list" onClick={() => setSelectedInfrastructure(null)}>
                            <Database className="mr-2 h-4 w-4" />
                            Infrastructures
                        </TabsTrigger>
                        {isAdmin && (
                            <TabsTrigger value="form" onClick={handleCancelEdit}>
                                <Plus className="mr-2 h-4 w-4" />
                                {isEditMode ? 'Edit Infrastructure' : 'Add Infrastructure'}
                            </TabsTrigger>
                        )}
                        <TabsTrigger
                            value="questions"
                            disabled={!selectedInfrastructure}
                        >
                            <HelpCircle className="mr-2 h-4 w-4" />
                            Manage Questions
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="list" className="mt-4">
                        <InfrastructureManagementList
                            infrastructures={infrastructures}
                            isLoading={isLoading}
                            onEdit={handleEdit}
                            onToggleStatus={toggleStatus}
                            onManageQuestions={handleManageQuestions}
                            isAdmin={isAdmin}
                        />
                    </TabsContent>

                    {isAdmin && (
                        <TabsContent value="form" className="mt-4">
                            <InfrastructureManagementForm
                                isEditMode={isEditMode}
                                editingInfrastructure={editingInfrastructure}
                                onSubmit={handleSubmit}
                                onCancelEdit={handleCancelEdit}
                            />
                        </TabsContent>
                    )}

                    <TabsContent value="questions" className="mt-4">
                        {selectedInfrastructure ? (
                            <InfrastructureQuestionsManager
                                infrastructureId={selectedInfrastructure.id}
                            />
                        ) : (
                            <Card className="card1 p-6">
                                <p className="text-center">Please select an infrastructure to manage its questions</p>
                            </Card>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </Card>
    );
};

export default InfrastructureManagement;