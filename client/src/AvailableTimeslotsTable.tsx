import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Trash2 } from "lucide-react";

interface Timeslot {
    id: number;
    infrastructure_id: number;
    booking_date: string;
    start_time: string;
    end_time: string;
    status: 'available';
}

interface Infrastructure {
    id: number;
    name: string;
    max_booking_duration?: number;
}

interface AvailableTimeslotsTableProps {
    timeslots: Timeslot[];
    selectedInfrastructure: Infrastructure;
    onCancelTimeslots: (ids: number[]) => Promise<void>;
}

const AvailableTimeslotsTable: React.FC<AvailableTimeslotsTableProps> = ({
    timeslots,
    selectedInfrastructure,
    onCancelTimeslots
}) => {
    const [dateFilter, setDateFilter] = useState<string>('');
    const [selectedSlots, setSelectedSlots] = useState<number[]>([]);

    const filteredTimeslots = timeslots.filter(slot =>
        !dateFilter || slot.booking_date === dateFilter
    );

    const handleCancelSelected = async () => {
        if (window.confirm(`Are you sure you want to cancel ${selectedSlots.length} selected timeslot(s)?`)) {
            await onCancelTimeslots(selectedSlots);
            setSelectedSlots([]);
        }
    };

    const handleCancelSingle = async (id: number) => {
        if (window.confirm('Are you sure you want to cancel this timeslot?')) {
            await onCancelTimeslots([id]);
        }
    };

    return (
        <Card className="card1">
            <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Available Timeslots</h2>
                    <div className="flex gap-4">
                        <Input
                            type="date"
                            value={dateFilter}
                            onChange={(e) => setDateFilter(e.target.value)}
                            className="w-auto"
                        />
                        {selectedSlots.length > 0 && (
                            <Button
                                variant="destructive"
                                onClick={handleCancelSelected}
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
                            <TableRow className="border-gray-700">
                                <TableHead className="w-12 text-center">
                                    <input
                                        type="checkbox"
                                        className="checkbox1"
                                        checked={selectedSlots.length === filteredTimeslots.length && filteredTimeslots.length > 0}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedSlots(filteredTimeslots.map(slot => slot.id));
                                            } else {
                                                setSelectedSlots([]);
                                            }
                                        }}
                                    />
                                </TableHead>
                                <TableHead className="text-center">Date</TableHead>
                                <TableHead className="text-center">Start Time</TableHead>
                                <TableHead className="text-center">End Time</TableHead>
                                <TableHead className="text-center">Duration</TableHead>
                                <TableHead className="text-center">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTimeslots.map((slot) => {
                                const startTime = new Date(`2000-01-01T${slot.start_time}`);
                                const endTime = new Date(`2000-01-01T${slot.end_time}`);
                                const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60);
                                const isOverMaxDuration = selectedInfrastructure.max_booking_duration &&
                                    duration > selectedInfrastructure.max_booking_duration;

                                return (
                                    <TableRow key={slot.id} className="border-gray-700 hover:bg-gray-700">
                                        <TableCell className="text-center">
                                            <input
                                                type="checkbox"
                                                className="checkbox1"
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
                                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="card1">
                                                    <DropdownMenuItem
                                                        onClick={() => handleCancelSingle(slot.id)}
                                                        className="card1-hover text-red-500"
                                                    >
                                                        Cancel
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                {filteredTimeslots.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        No available timeslots for this infrastructure.
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AvailableTimeslotsTable;