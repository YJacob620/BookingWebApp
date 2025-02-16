import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowUpDown,
    MoreHorizontal,
    ArrowLeftCircle,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

interface SortConfig {
    key: keyof Infrastructure | null;
    direction: 'asc' | 'desc';
}

const InfrastructureManagement: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading } = useAdminAuth();
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [message, setMessage] = useState<Message>({ type: '', text: '' });
    const [isEditMode, setIsEditMode] = useState(false);
    const [editingInfrastructure, setEditingInfrastructure] = useState<Infrastructure | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });
    const [formData, setFormData] = useState<FormData>({
        name: '',
        description: '',
        location: '',
        is_active: true,
    });

    useEffect(() => {
        if (isAuthorized) {
            fetchInfrastructures();
        }
    }, [isAuthorized]);

    const fetchInfrastructures = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/infrastructures', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setInfrastructures(data);
            }
        } catch (error) {
            console.error('Error fetching infrastructures:', error);
            setMessage({ type: 'error', text: 'Failed to fetch infrastructures' });
        }
    };

    const handleInputChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // const handleCheckboxChange = (checked: boolean) => {
    //     setFormData(prev => ({
    //         ...prev,
    //         is_active: checked
    //     }));
    // };
    const handleCheckboxChange = (checked: boolean | 'indeterminate') => {
        // Only update if it's a boolean value
        if (typeof checked === 'boolean') {
            setFormData(prev => ({
                ...prev,
                is_active: checked
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
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
                } else {
                    setFormData({
                        name: '',
                        description: '',
                        location: '',
                        is_active: true,
                    });
                }

                fetchInfrastructures();
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.message || `Failed to ${isEditMode ? 'update' : 'add'} infrastructure` });
            }
        } catch (error) {
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} infrastructure:`, error);
            setMessage({
                type: 'error',
                text: `An error occurred while ${isEditMode ? 'updating' : 'adding'} the infrastructure`
            });
        }
    };

    const handleSort = (key: keyof Infrastructure) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedData = React.useMemo(() => {
        let filtered = [...infrastructures];

        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        if (sortConfig.key) {
            filtered.sort((a, b) => {
                const aValue = a[sortConfig.key!];
                const bValue = b[sortConfig.key!];

                // Handle null values by treating them as "less than" non-null values
                if (aValue === null && bValue === null) return 0;
                if (aValue === null) return 1;
                if (bValue === null) return -1;

                // Now we can safely compare non-null values
                if (aValue < bValue) {
                    return sortConfig.direction === 'asc' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'asc' ? 1 : -1;
                }
                return 0;
            });
        }

        return filtered;
    }, [infrastructures, searchQuery, sortConfig]);

    const handleEdit = (infrastructure: Infrastructure) => {
        setIsEditMode(true);
        setEditingInfrastructure(infrastructure);
        setFormData({
            name: infrastructure.name,
            description: infrastructure.description,
            location: infrastructure.location || '',
            is_active: Boolean(infrastructure.is_active),
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleCancelEdit = () => {
        setIsEditMode(false);
        setEditingInfrastructure(null);
        setFormData({
            name: '',
            description: '',
            location: '',
            is_active: true,
        });
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

    if (isLoading) {
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
                        variant="secondary"
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

                <Card className="card1 mb-8">
                    <CardContent className="p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-semibold">
                                {isEditMode ? 'Edit Infrastructure' : 'Add New Infrastructure'}
                            </h2>
                            {isEditMode && (
                                <Button
                                    onClick={handleCancelEdit}
                                    variant="secondary"
                                >
                                    Cancel Edit
                                </Button>
                            )}
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Infrastructure Name *</Label>
                                    <Input
                                        id="name"
                                        name="name"
                                        required
                                        maxLength={100}
                                        value={formData.name}
                                        onChange={handleInputChange}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="location">Location</Label>
                                    <Input
                                        id="location"
                                        name="location"
                                        maxLength={100}
                                        value={formData.location}
                                        onChange={handleInputChange}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description *</Label>
                                <Textarea
                                    id="description"
                                    name="description"
                                    required
                                    value={formData.description}
                                    onChange={handleInputChange}
                                    className="h-32"
                                />
                            </div>

                            <div className="flex items-center space-x-2 pl-1">
                                <Checkbox
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={handleCheckboxChange}
                                    className="checkbox1 h-5 w-5"
                                />
                                <Label htmlFor="is_active">Infrastructure is active</Label>
                            </div>

                            <Button type="submit">
                                {isEditMode ? 'Update Infrastructure' : 'Add Infrastructure'}
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                <Card className="card1">
                    <CardContent className="p-6">
                        <h2 className="text-xl font-semibold mb-4">Existing Infrastructures</h2>
                        <div className="mb-4">
                            <Input
                                placeholder="Search infrastructures..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="rounded-md border border-gray-700">
                            <Table>
                                <TableHeader>
                                    <TableRow className="border-gray-700">
                                        <TableHead className="text-center">
                                            <Button
                                                variant="ghost"
                                                onClick={() => handleSort('name')}
                                                className="sort-button"
                                            >
                                                Name
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-center">Description</TableHead>
                                        <TableHead className="text-center">
                                            <Button
                                                className="sort-button"
                                                onClick={() => handleSort('location')}
                                            >
                                                Location
                                                <ArrowUpDown className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-center">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAndSortedData.map((infra) => (
                                        <TableRow key={infra.id} className="border-gray-700 hover:bg-gray-700 ">
                                            <TableCell className="font-medium text-center">
                                                {infra.name}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {infra.description.length > 100
                                                    ? `${infra.description.substring(0, 100)}...`
                                                    : infra.description}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {infra.location || 'N/A'}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <span className={`px-2 py-1 rounded ${infra.is_active
                                                    ? 'bg-green-800 text-green-100'
                                                    : 'bg-red-800 text-red-100'
                                                    }`}>
                                                    {infra.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="card1">
                                                        <DropdownMenuItem
                                                            onClick={() => handleEdit(infra)}
                                                            className="card1-hover"
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => toggleStatus(infra.id, infra.is_active)}
                                                            className="card1-hover"
                                                        >
                                                            {infra.is_active ? 'Set Inactive' : 'Set Active'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </Card>
    );
};

export default InfrastructureManagement;