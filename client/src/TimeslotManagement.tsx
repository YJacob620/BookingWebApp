import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from './useAdminAuth';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
    Trash2,
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
    max_booking_duration?: number;
}

interface Timeslot {
    id: number;
    infrastructure_id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: 'available';
}

interface Message {
    type: 'success' | 'error' | 'warning';
    text: string;
}

interface BatchFormData {
    startDate: string;
    endDate: string;
    dailyStartTime: string;
    slotDuration: number;
    slotsPerDay: number;
}

const TimeslotManagement: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading } = useAdminAuth();
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [selectedInfraId, setSelectedInfraId] = useState<number | null>(null);
    const [timeslots, setTimeslots] = useState<Timeslot[]>([]);
    const [message, setMessage] = useState<Message | null>(null);
    const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
    const [dateFilter, setDateFilter] = useState<string>('');

    const [singleSlotForm, setSingleSlotForm] = useState({
        date: '',
        startTime: '',
        endTime: ''
    });
    const [batchForm, setBatchForm] = useState<BatchFormData>({
        startDate: '',
        endDate: '',
        dailyStartTime: '',
        slotDuration: 60,
        slotsPerDay: 1
    });


    useEffect(() => {
        if (isAuthorized) {
            fetchInfrastructures();
        }
    }, [isAuthorized]);

    // Modify useEffect to re-fetch when date filter changes
    useEffect(() => {
        if (selectedInfraId) {
            fetchTimeslots();
        }
    }, [selectedInfraId, dateFilter]);


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
                if (data.length > 0) {
                    setSelectedInfraId(data[0].id);
                }
            }
        } catch (error) {
            console.error('Error fetching infrastructures:', error);
            setMessage({ type: 'error', text: 'Failed to fetch infrastructures' });
        }
    };

    const fetchTimeslots = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`http://localhost:3001/api/bookings/available/${selectedInfraId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                // Apply date filter if set
                const filteredData = dateFilter
                    ? data.filter((slot: Timeslot) => slot.booking_date === dateFilter)
                    : data;
                setTimeslots(filteredData);
            }
        } catch (error) {
            console.error('Error fetching timeslots:', error);
            setMessage({ type: 'error', text: 'Failed to fetch timeslots' });
        }
    };


    const handleSingleSlotSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/bookings/timeslot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    infrastructure_id: selectedInfraId,
                    booking_date: singleSlotForm.date,
                    start_time: singleSlotForm.startTime,
                    end_time: singleSlotForm.endTime,
                    status: 'available'
                })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Timeslot created successfully' });
                setSingleSlotForm({ date: '', startTime: '', endTime: '' });
                fetchTimeslots();
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.message || 'Failed to create timeslot' });
            }
        } catch (error) {
            console.error('Error creating timeslot:', error);
            setMessage({ type: 'error', text: 'An error occurred while creating the timeslot' });
        }
    };

    const handleBatchSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/bookings/timeslots/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    infrastructure_id: selectedInfraId,
                    ...batchForm
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessage({
                    type: 'success',
                    text: `Successfully created ${data.created} timeslots${data.skipped ? `. Skipped ${data.skipped} overlapping slots.` : ''}`
                });
                fetchTimeslots();
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.message || 'Failed to create batch timeslots' });
            }
        } catch (error) {
            console.error('Error creating batch timeslots:', error);
            setMessage({ type: 'error', text: 'An error occurred while creating the timeslots' });
        }
    };

    const handleDeleteTimeslots = async (ids: number[]) => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:3001/api/bookings/timeslots', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ ids })
            });

            if (response.ok) {
                setMessage({ type: 'success', text: `Successfully canceled ${ids.length} timeslot(s)` });
                setSelectedSlots([]);
                fetchTimeslots();
            } else {
                const data = await response.json();
                setMessage({ type: 'error', text: data.message || 'Failed to cancel timeslots' });
            }
        } catch (error) {
            console.error('Error canceling timeslots:', error);
            setMessage({ type: 'error', text: 'An error occurred while canceling the timeslots' });
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

    const selectedInfrastructure = infrastructures.find(i => i.id === selectedInfraId);

    return (
        <Card className="general-container min-w-200">
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
                    <h1>Timeslot Management</h1>
                </div>

                {message && (
                    <Alert
                        className={`mb-6 ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}
                    >
                        <AlertDescription>{message.text}</AlertDescription>
                    </Alert>
                )}

                <div className="mb-6">
                    <Label htmlFor="infrastructure">Select Infrastructure</Label>
                    <select
                        id="infrastructure"
                        className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md mt-1"
                        value={selectedInfraId || ''}
                        onChange={(e) => setSelectedInfraId(Number(e.target.value))}
                    >
                        {infrastructures.map(infra => (
                            <option key={infra.id} value={infra.id}>
                                {infra.name}
                            </option>
                        ))}
                    </select>
                </div>

                {selectedInfrastructure && (
                    <>
                        <Card className="card1 mb-8">
                            <CardContent className="p-6">
                                <Tabs defaultValue="single" className="w-full">
                                    <TabsList className="grid w-full grid-cols-2 gap-4 mb-5">
                                        <TabsTrigger value="single">Create Single Slot</TabsTrigger>
                                        <TabsTrigger value="batch">Batch Create Slots</TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="single">
                                        <form onSubmit={handleSingleSlotSubmit} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label htmlFor="date">Date</Label>
                                                    <Input
                                                        id="date"
                                                        type="date"
                                                        value={singleSlotForm.date}
                                                        onChange={(e) => setSingleSlotForm(prev => ({
                                                            ...prev,
                                                            date: e.target.value
                                                        }))}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="startTime">Start Time</Label>
                                                    <Input
                                                        id="startTime"
                                                        type="time"
                                                        value={singleSlotForm.startTime}
                                                        onChange={(e) => setSingleSlotForm(prev => ({
                                                            ...prev,
                                                            startTime: e.target.value
                                                        }))}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="endTime">End Time</Label>
                                                    <Input
                                                        id="endTime"
                                                        type="time"
                                                        value={singleSlotForm.endTime}
                                                        onChange={(e) => setSingleSlotForm(prev => ({
                                                            ...prev,
                                                            endTime: e.target.value
                                                        }))}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <Button type="submit">Create Timeslot</Button>
                                        </form>
                                    </TabsContent>

                                    <TabsContent value="batch">
                                        <form onSubmit={handleBatchSubmit} className="space-y-4">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="startDate">Start Date</Label>
                                                    <Input
                                                        id="startDate"
                                                        type="date"
                                                        value={batchForm.startDate}
                                                        onChange={(e) => setBatchForm(prev => ({
                                                            ...prev,
                                                            startDate: e.target.value
                                                        }))}
                                                        min={new Date().toISOString().split('T')[0]}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="endDate">End Date</Label>
                                                    <Input
                                                        id="endDate"
                                                        type="date"
                                                        value={batchForm.endDate}
                                                        onChange={(e) => setBatchForm(prev => ({
                                                            ...prev,
                                                            endDate: e.target.value
                                                        }))}
                                                        min={batchForm.startDate}
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                <div>
                                                    <Label htmlFor="dailyStartTime">Daily Start Time</Label>
                                                    <Input
                                                        id="dailyStartTime"
                                                        type="time"
                                                        value={batchForm.dailyStartTime}
                                                        onChange={(e) => setBatchForm(prev => ({
                                                            ...prev,
                                                            dailyStartTime: e.target.value
                                                        }))}
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="slotDuration">Slot Duration (minutes)</Label>
                                                    <Input
                                                        id="slotDuration"
                                                        type="number"
                                                        value={batchForm.slotDuration}
                                                        onChange={(e) => setBatchForm(prev => ({
                                                            ...prev,
                                                            slotDuration: Number(e.target.value)
                                                        }))}
                                                        min="1"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <Label htmlFor="slotsPerDay">Slots Per Day</Label>
                                                    <Input
                                                        id="slotsPerDay"
                                                        type="number"
                                                        value={batchForm.slotsPerDay}
                                                        onChange={(e) => setBatchForm(prev => ({
                                                            ...prev,
                                                            slotsPerDay: Number(e.target.value)
                                                        }))}
                                                        min="1"
                                                        max="24"
                                                        required
                                                    />
                                                </div>
                                            </div>
                                            <Button type="submit">Create Batch Timeslots</Button>
                                        </form>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>

                        <Card className="card1">
                            <CardContent className="p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold">Available Timeslots</h2>
                                    <div className="flex items-center space-x-4">
                                        <div>
                                            <Label htmlFor="dateFilter">Filter by Date</Label>
                                            <Input
                                                id="dateFilter"
                                                type="date"
                                                value={dateFilter}
                                                onChange={(e) => setDateFilter(e.target.value)}
                                                className="ml-2"
                                                min={new Date().toISOString().split('T')[0]}
                                            />
                                        </div>
                                        {dateFilter && (
                                            <Button
                                                variant="outline"
                                                onClick={() => setDateFilter('')}
                                            >
                                                Clear Filter
                                            </Button>
                                        )}
                                        {selectedSlots.length > 0 && (
                                            <Button
                                                variant="destructive"
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to cancel ${selectedSlots.length} selected timeslot(s)?`)) {
                                                        handleDeleteTimeslots(selectedSlots);
                                                    }
                                                }}
                                                className="flex items-center"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Cancel Selected ({selectedSlots.length})
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                <div className="rounded-md border border-gray-700">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-gray-700 text-center">
                                                {/* ... existing headers ... */}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {timeslots.map((slot) => (
                                                <TableRow
                                                    key={slot.id}
                                                    className="border-gray-700 hover:bg-gray-700 text-center"
                                                >
                                                    {/* All TableCell elements should have text-center class */}
                                                    <TableCell className="text-center">
                                                        <input
                                                            type="checkbox"
                                                            className="checkbox1 mx-auto"
                                                            checked={selectedSlots.includes(slot.id)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedSlots(prev => [...prev, slot.id]);
                                                                } else {
                                                                    setSelectedSlots(prev => prev.filter(id => id !== slot.id));
                                                                }
                                                            }}
                                                        />
                                                    </TableCell>
                                                    {/* Apply text-center to all other cells */}
                                                    <TableCell className="text-center">
                                                        {new Date(slot.booking_date).toLocaleDateString('en-US', {
                                                            weekday: 'long',
                                                            year: 'numeric',
                                                            month: 'long',
                                                            day: 'numeric'
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {startTime.toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {endTime.toLocaleTimeString('en-US', {
                                                            hour: 'numeric',
                                                            minute: '2-digit'
                                                        })}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {duration} minutes
                                                            {isOverMaxDuration && (
                                                                <span className="text-xs text-red-500">
                                                                    (Exceeds max)
                                                                </span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0 mx-auto">
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="card1">
                                                                <DropdownMenuItem
                                                                    onClick={() => {
                                                                        if (window.confirm('Are you sure you want to cancel this timeslot?')) {
                                                                            handleDeleteTimeslots([slot.id]);
                                                                        }
                                                                    }}
                                                                    className="card1-hover text-red-500"
                                                                >
                                                                    Cancel
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {timeslots.length === 0 && (
                                    <div className="text-center py-8 text-gray-400">
                                        {dateFilter
                                            ? `No available timeslots on ${new Date(dateFilter).toLocaleDateString()}`
                                            : 'No available timeslots for this infrastructure.'
                                        }
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                    </>
                )}
            </div>
        </Card>
    );
};

export default TimeslotManagement;