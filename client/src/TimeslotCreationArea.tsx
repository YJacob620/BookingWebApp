import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

interface BatchFormData {
    startDate: string;
    endDate: string;
    dailyStartTime: string;
    slotDuration: number;
    slotsPerDay: number;
}

interface SingleSlotForm {
    date: string;
    startTime: string;
    endTime: string;
}

interface TimeslotCreationAreaProps {
    selectedInfraId: number | null;
    onTimeslotsCreated: () => void;
    onError: (message: string) => void;
    onSuccess: (message: string) => void;
}

const TimeslotCreationArea: React.FC<TimeslotCreationAreaProps> = ({
    selectedInfraId,
    onTimeslotsCreated,
    onError,
    onSuccess
}) => {
    const [singleSlotForm, setSingleSlotForm] = useState<SingleSlotForm>({
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
                onSuccess('Timeslot created successfully');
                setSingleSlotForm({ date: '', startTime: '', endTime: '' });
                onTimeslotsCreated();
            } else {
                const data = await response.json();
                onError(data.message || 'Failed to create timeslot');
            }
        } catch (error) {
            console.error('Error creating timeslot:', error);
            onError('An error occurred while creating the timeslot');
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
                onSuccess(`Successfully created ${data.created} timeslots${data.skipped ? `. Skipped ${data.skipped} overlapping slots.` : ''}`);
                onTimeslotsCreated();
            } else {
                const data = await response.json();
                onError(data.message || 'Failed to create batch timeslots');
            }
        } catch (error) {
            console.error('Error creating batch timeslots:', error);
            onError('An error occurred while creating the timeslots');
        }
    };

    return (
        <Card className="card1 mb-8">
            <CardContent className="p-6">
                <Tabs defaultValue="single" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 gap-4 mb-5">
                        <TabsTrigger
                            value="single"
                            className="data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:shadow-lg"
                        >
                            Create Single Slot
                        </TabsTrigger>
                        <TabsTrigger
                            value="batch"
                            className="data-[state=active]:border-2 data-[state=active]:border-white data-[state=active]:shadow-lg"
                        >
                            Batch Create Slots
                        </TabsTrigger>
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
    );
};

export default TimeslotCreationArea;

