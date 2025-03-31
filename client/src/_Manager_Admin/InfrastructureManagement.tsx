import React, { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Plus, Database, Filter } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import InfrastructureManagementForm from '../_Admin/InfrastructureManagementForm';
import InfrastructureManagementList from './InfrastructureManagementList';
import InfrastructureQuestionsManager from './InfrastructureManagementQuestions';

import {
    fetchInfrastructures,
    createOrUpdateInfrastructure,
    toggleInfrastructureStatus,
    Infrastructure,
    Message,
    InfrastFormData,
    getLocalUser
} from '@/utils';
import BasePageLayout from '@/components/_BasePageLayout';


const InfrastructureManagement: React.FC = () => {

    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<Message | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingInfrastructure, setEditingInfrastructure] = useState<Infrastructure | null>(null);
    const [activeTab, setActiveTab] = useState<string>("list");
    const [selectedInfrastructure, setSelectedInfrastructure] = useState<Infrastructure | null>(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isAdmin, setIsAdmin] = useState<boolean>(false);

    useEffect(() => {
        setIsAdmin(getLocalUser()?.role === "admin");
        getInfrastructures();
    }, [refreshTrigger]);

    const getInfrastructures = async () => {
        try {
            setIsLoading(true);
            const data = await fetchInfrastructures();
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

            // Refresh the list
            setRefreshTrigger(prev => prev + 1);
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
            setRefreshTrigger(prev => prev + 1);
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
        <BasePageLayout
            pageTitle="Infrastructure Management"
            showDashboardButton
            alertMessage={message}
            className={"w-230"}
        >
            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="mb-6"
            >
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="list" onClick={() => {
                        setSelectedInfrastructure(null);
                        handleCancelEdit();
                    }}>
                        <Database className="mr-2 h-4 w-4" />
                        {isAdmin ? 'All Infrastructures' : 'Your Infrastructures'}
                    </TabsTrigger>
                    {isAdmin && (
                        <TabsTrigger value="form">
                            {isEditMode ? 'Editing Infrastructure' : (<><Plus className="mr-2 h-4 w-4" /> Add Infrastructure</>)}
                        </TabsTrigger>
                    )}
                    <TabsTrigger
                        value="questions"
                        disabled={!selectedInfrastructure}
                    >
                        <Filter className="mr-2 h-4 w-4" />
                        Manage Filter Questions
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="mt-4">
                    <InfrastructureManagementList
                        infrastructures={infrastructures}
                        isLoading={isLoading}
                        onEdit={handleEdit}
                        onToggleStatus={toggleStatus}
                        onManageQuestions={handleManageQuestions}
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
        </BasePageLayout>
    );
};

export default InfrastructureManagement;