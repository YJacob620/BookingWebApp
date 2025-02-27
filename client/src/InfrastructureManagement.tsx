import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle } from "lucide-react";
import InfrastructureManagementForm from './InfrastructureManagementForm';
import InfrastructureManagementList from './InfrastructureManagementList';

// Import types and API utilities
import {
    fetchInfrastructures,
    apiRequest,
    Infrastructure,
    Message
} from '@/utils';

export interface InfrastFormData {
    name: string;
    description: string;
    location: string;
    is_active: boolean;
}

const InfrastructureManagement: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading: authLoading } = useAdminAuth();
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [message, setMessage] = useState<Message>({ type: '', text: '' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingInfrastructure, setEditingInfrastructure] = useState<Infrastructure | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isAuthorized) {
            getInfrastructures();
        }
    }, [isAuthorized]);

    const getInfrastructures = async () => {
        try {
            setIsLoading(true);
            // Use the fetchInfrastructures utility instead of direct fetch
            const data = await fetchInfrastructures();
            setInfrastructures(data);
        } catch (error) {
            console.error('Error fetching infrastructures:', error);
            setMessage({ type: 'error', text: 'Failed to fetch infrastructures' });
        } finally {
            setIsLoading(false);
        }
    };

    // Create or update infrastructure
    const handleSubmit = async (formData: InfrastFormData) => {
        try {
            let url = '/infrastructures';
            let method = 'POST';

            if (isEditMode && editingInfrastructure) {
                url += `/${editingInfrastructure.id}`;
                method = 'PUT';
            }

            // Use the apiRequest utility instead of direct fetch
            await apiRequest(url, {
                method,
                body: JSON.stringify(formData)
            });

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
        setIsEditMode(true);
        setEditingInfrastructure(infrastructure);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditingInfrastructure(null);
    };

    // Toggle infrastructure status (active/inactive)
    const toggleStatus = async (id: number, currentStatus: boolean) => {
        if (!confirm(currentStatus
            ? 'Warning: Setting an infrastructure as inactive will not cancel existing bookings. Continue?'
            : 'Set this infrastructure as active?')) {
            return;
        }

        try {
            // Use the apiRequest utility instead of direct fetch
            await apiRequest(`/infrastructures/${id}/toggle-status`, {
                method: 'POST'
            });

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
                        onClick={() => navigate('/admin-dashboard')}
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

                {/* Infrastructure Form Component */}
                <InfrastructureManagementForm
                    isEditMode={isEditMode}
                    editingInfrastructure={editingInfrastructure}
                    onSubmit={handleSubmit}
                    onCancelEdit={handleCancelEdit}
                />

                {/* Infrastructure List Component */}
                <InfrastructureManagementList
                    infrastructures={infrastructures}
                    isLoading={isLoading}
                    onEdit={handleEdit}
                    onToggleStatus={toggleStatus}
                />
            </div>
        </Card>
    );
};

export default InfrastructureManagement;