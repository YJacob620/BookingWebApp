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
    MoreHorizontal,
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

interface SortConfig {
    key: keyof Infrastructure | null;
    direction: 'asc' | 'desc';
}

interface InfrastructureListProps {
    infrastructures: Infrastructure[];
    isLoading: boolean;
    onEdit: (infrastructure: Infrastructure) => void;
    onToggleStatus: (id: number, currentStatus: boolean) => Promise<void>;
}

const InfrastructureManagementList: React.FC<InfrastructureListProps> = ({
    infrastructures,
    isLoading,
    onEdit,
    onToggleStatus
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

    return (
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
                {isLoading ? (
                    <div className="text-center py-10">Loading infrastructures...</div>
                ) : (
                    <div className="rounded-md border border-gray-700">
                        <Table>
                            <TableHeader>
                                <TableRow className="border-gray-700">
                                    <TableHead className="text-center">
                                        <Button
                                            variant="ghost"
                                            onClick={() => handleSort('name')}
                                        // className="sort-button"
                                        >
                                            Name
                                            <ArrowUpDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </TableHead>
                                    <TableHead className="text-center">Description</TableHead>
                                    <TableHead className="text-center">
                                        <Button
                                            // className="sort-button"
                                            variant="ghost"
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
                                {filteredAndSortedData.length > 0 ? (
                                    filteredAndSortedData.map((infra) => (
                                        <TableRow key={infra.id} className="border-gray-700 def-hover ">
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
                                                    <DropdownMenuContent align="end" className="bg-gray-700">
                                                        <DropdownMenuItem
                                                            onClick={() => onEdit(infra)}
                                                            className="hover:bg-gray-500"
                                                        >
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => onToggleStatus(infra.id, infra.is_active)}
                                                            className="hover:bg-gray-500"
                                                        >
                                                            {infra.is_active ? 'Set Inactive' : 'Set Active'}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
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