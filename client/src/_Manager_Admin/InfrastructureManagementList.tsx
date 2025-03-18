import React, { useState, useMemo } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
    Edit,
    Power,
    HelpCircle
} from "lucide-react";

import { Infrastructure } from '@/_utils';
import TruncatedTextCell from '@/components/_TruncatedTextCell';

interface SortConfig {
    key: keyof Infrastructure | null;
    direction: 'asc' | 'desc';
}

interface InfrastructureListProps {
    infrastructures: Infrastructure[];
    isLoading: boolean;
    onEdit: (infrastructure: Infrastructure) => void;
    onToggleStatus: (id: number, currentStatus: boolean) => Promise<void>;
    onManageQuestions: (infrastructure: Infrastructure) => void;
    isAdmin: boolean;
}

const InfrastructureManagementList: React.FC<InfrastructureListProps> = ({
    infrastructures,
    isLoading,
    onEdit,
    onToggleStatus,
    onManageQuestions,
    isAdmin
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'asc' });

    const handleSort = (key: keyof Infrastructure) => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    const filteredAndSortedData = useMemo(() => {
        let filtered = [...infrastructures];

        if (searchQuery) {
            filtered = filtered.filter(item =>
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
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

                // For string comparison
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    return sortConfig.direction === 'asc'
                        ? aValue.localeCompare(bValue)
                        : bValue.localeCompare(aValue);
                }

                // For boolean comparison
                if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    if (aValue === bValue) return 0;
                    return sortConfig.direction === 'asc'
                        ? (aValue ? 1 : -1)
                        : (aValue ? -1 : 1);
                }

                // For number comparison
                if (typeof aValue === 'number' && typeof bValue === 'number') {
                    return sortConfig.direction === 'asc'
                        ? aValue - bValue
                        : bValue - aValue;
                }

                return 0; // Default case
            });
        }

        return filtered;
    }, [infrastructures, searchQuery, sortConfig]);

    return (
        <Card className="card1">
            <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">
                    {isAdmin ? 'All Infrastructures' : 'Your Managed Infrastructures'}
                </h2>
                <div className="mb-4">
                    <Input
                        placeholder="Search infrastructures..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                {isLoading ? (
                    <div className="text-center py-10">Loading infrastructures...</div>
                ) : (
                    <div className="table-wrapper">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('name')}
                                        >
                                            Name
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Description</TableHead>
                                    <TableHead>
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('location')}
                                        >
                                            Location
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredAndSortedData.length > 0 ? (
                                    filteredAndSortedData.map((infra) => (
                                        <TableRow key={infra.id} className="border-gray-700 def-hover ">
                                            <TableCell className="font-medium text-center">
                                                {infra.name}
                                            </TableCell>
                                            <TruncatedTextCell
                                                text={infra.description}
                                                maxLength={40}
                                                cellClassName="text-center"
                                            />
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
                                                <div className="flex justify-center space-x-2">
                                                    {/* Button to edit infrastructure (admin only) */}
                                                    {isAdmin && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => onEdit(infra)}
                                                            className="text-blue-400"
                                                            title="Edit Infrastructure"
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                    )}

                                                    {/* Button to manage questions (both admin and managers) */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onManageQuestions(infra)}
                                                        className="text-purple-400"
                                                        title="Manage Questions"
                                                    >
                                                        <HelpCircle className="h-4 w-4" />
                                                    </Button>

                                                    {/* Toggle status button (admin only) */}
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onToggleStatus(infra.id, infra.is_active ?? false)}
                                                        className={infra.is_active ? "text-red-400" : "text-green-400"}
                                                        title={infra.is_active ? "Set Inactive" : "Set Active"}
                                                    >
                                                        <Power className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            <div className="text-gray-400">
                                                {infrastructures.length > 0
                                                    ? 'No infrastructures match your search criteria.'
                                                    : 'No infrastructures found.'}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default InfrastructureManagementList;