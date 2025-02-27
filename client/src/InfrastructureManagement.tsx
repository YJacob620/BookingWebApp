import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeftCircle } from "lucide-react";

// Import our new components
import InfrastructureManagementForm from './InfrastructureManagementForm';
import InfrastructureManagementList from './InfrastructureManagementList';

interface Infrastructure {
    id: number;
    name: string;
    description: string;
    location: string | null;
    is_active: boolean;
}

interface FormData {
    name: string;
    description: string;
    location: string;
    is_active: boolean;
}

interface Message {
    type: 'success' | 'error' | '';
    text: string;
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
            fetchInfrastructures();
        }
    }, [isAuthorized]);

    const fetchInfrastructures = async () => {
        try {
            setIsLoading(true);
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/infrastructures', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setInfrastructures(data);
            } else {
                setMessage({ type: 'error', text: 'Failed to fetch infrastructures' });
            }
        } catch (error) {
            console.error('Error fetching infrastructures:', error);
            setMessage({ type: 'error', text: 'Failed to fetch infrastructures' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (formData: FormData) => {
        try {
            const token = localStorage.getItem('token');
            let url = 'http://localhost:3001/api/infrastructures';
            let method = 'POST';

            if (isEditMode && editingInfrastructure) {
                url += `/${editingInfrastructure.id}`;
                method = 'PUT';
            }

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setMessage({
                    type: 'success',
                    text: `Infrastructure ${isEditMode ? 'updated' : 'added'} successfully!`
                });

                if (isEditMode) {
                    handleCancelEdit();
                }

                fetchInfrastructures();
            } else {
                const data = await response.json();
                setMessage({
                    type: 'error',
                    text: data.message || `Failed to ${isEditMode ? 'update' : 'add'} infrastructure`
                });
            }
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} infrastructure:`, error);
            setMessage({
                type: 'error',
                text: `An error occurred while ${isEditMode ? 'updating' : 'adding'} the infrastructure`
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

    const toggleStatus = async (id: number, currentStatus: boolean) => {
        if (!confirm(currentStatus
            ? 'Warning: Setting an infrastructure as inactive will not cancel existing bookings. Continue?'
            : 'Set this infrastructure as active?')) {
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/infrastructures/${id}/toggle-status`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Status updated successfully!' });
                fetchInfrastructures();
            } else {
                setMessage({ type: 'error', text: 'Failed to update status' });
            }
        } catch (error) {
            console.error('Error toggling status:', error);
            setMessage({ type: 'error', text: 'An error occurred while updating the status' });
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