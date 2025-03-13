import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeftCircle, Search, UserCheck, UserX, Shield } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAdminAuth } from './useAdminAuth';
import {
    fetchUsers,
    updateUserRole,
    toggleUserBlacklist,
    fetchInfrastructures,
    assignInfrastructureToManager,
    removeInfrastructureFromManager,
    fetchUserInfrastructures
} from '@/_utils';
import { ADMIN_DASHBOARD } from '@/RoutePaths';

const UserManagement: React.FC = () => {
    const navigate = useNavigate();
    const { isAuthorized, isLoading: authLoading } = useAdminAuth();

    // State management
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [infrastructures, setInfrastructures] = useState([]);

    // Dialog state
    const [isManagerDialogOpen, setIsManagerDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [assignedInfrastructures, setAssignedInfrastructures] = useState<number[]>([]);

    useEffect(() => {
        if (isAuthorized) {
            loadUsers();
            loadInfrastructures();
        }
    }, [isAuthorized]);

    useEffect(() => {
        filterUsers();
    }, [users, searchQuery]);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const data = await fetchUsers();
            setUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
            setError('Failed to load users');
        } finally {
            setIsLoading(false);
        }
    };

    const loadInfrastructures = async () => {
        try {
            const data = await fetchInfrastructures();
            setInfrastructures(data);
        } catch (error) {
            console.error('Error loading infrastructures:', error);
        }
    };

    const filterUsers = () => {
        if (!searchQuery) {
            setFilteredUsers(users);
            return;
        }

        const query = searchQuery.toLowerCase();
        const filtered = users.filter(user =>
            user.name.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        );

        setFilteredUsers(filtered);
    };

    const handleRoleChange = async (userId: number, newRole: string) => {
        try {
            await updateUserRole(userId, newRole);

            // Update local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, role: newRole } : user
                )
            );

            setSuccess(`User role updated successfully`);

            // If changing to/from infrastructure_manager, reload user data to get assigned infrastructures
            if (newRole === 'infrastructure_manager' ||
                users.find(u => u.id === userId)?.role === 'infrastructure_manager') {
                loadUsers();
            }

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error updating user role:', error);
            setError('Failed to update user role');

            // Clear error message after 3 seconds
            setTimeout(() => setError(null), 3000);
        }
    };

    const handleBlacklistToggle = async (userId: number, currentStatus: boolean) => {
        try {
            await toggleUserBlacklist(userId, !currentStatus);

            // Update local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, is_blacklisted: !currentStatus } : user
                )
            );

            setSuccess(`User ${!currentStatus ? 'blacklisted' : 'un-blacklisted'} successfully`);

            // Clear success message after 3 seconds
            setTimeout(() => setSuccess(null), 3000);
        } catch (error) {
            console.error('Error toggling blacklist status:', error);
            setError('Failed to update blacklist status');

            // Clear error message after 3 seconds
            setTimeout(() => setError(null), 3000);
        }
    };

    const openManagerDialog = async (user: any) => {
        setSelectedUser(user);

        // Load assigned infrastructures for this manager
        try {
            // Use the admin version that takes a user ID parameter
            const data = await fetchUserInfrastructures(user.id);
            setAssignedInfrastructures(data.map(infra => infra.id));
        } catch (error) {
            console.error('Error loading manager infrastructures:', error);
            setAssignedInfrastructures([]);
        }

        setIsManagerDialogOpen(true);
    };

    const handleInfrastructureToggle = async (infrastructureId: number, isAssigned: boolean) => {
        if (!selectedUser) return;

        try {
            if (isAssigned) {
                await assignInfrastructureToManager(selectedUser.id, infrastructureId);
                setAssignedInfrastructures(prev => [...prev, infrastructureId]);
            } else {
                await removeInfrastructureFromManager(selectedUser.id, infrastructureId);
                setAssignedInfrastructures(prev => prev.filter(id => id !== infrastructureId));
            }
        } catch (error) {
            console.error('Error updating infrastructure assignment:', error);
            setError('Failed to update infrastructure assignment');

            // Clear error message after 3 seconds
            setTimeout(() => setError(null), 3000);
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
                        onClick={() => navigate(ADMIN_DASHBOARD)}
                        className="back-button"
                    >
                        <ArrowLeftCircle className="mr-2 h-4 w-4" />
                        Back to Dashboard
                    </Button>
                </div>

                <div className="flex justify-between items-center mb-8">
                    <h1>User Management</h1>
                </div>

                {error && (
                    <Alert className="mb-6 alert-error">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {success && (
                    <Alert className="mb-6 alert-success">
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                {/* Search bar */}
                <div className="mb-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            placeholder="Search users by name, email, or role..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Users table */}
                <Card className="card1">
                    <CardContent className="p-6">
                        {isLoading ? (
                            <div className="text-center py-10">Loading users...</div>
                        ) : (
                            <div className="table-wrapper">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Role</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.length > 0 ? (
                                            filteredUsers.map((user) => (
                                                <TableRow key={user.id} className="border-gray-700">
                                                    <TableCell className="font-medium">{user.name}</TableCell>
                                                    <TableCell>{user.email}</TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={user.role}
                                                            onValueChange={(value) => handleRoleChange(user.id, value)}
                                                            disabled={user.id === users.find(u => u.role === 'admin')?.id} // Prevent changing the first admin
                                                        >
                                                            <SelectTrigger className="w-36">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                                <SelectItem value="infrastructure_manager">Infrastructure Manager</SelectItem>
                                                                <SelectItem value="faculty">Faculty</SelectItem>
                                                                <SelectItem value="student">Student</SelectItem>
                                                                <SelectItem value="guest">Guest</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={user.is_blacklisted ? 'bg-red-700' : 'bg-green-700'}>
                                                            {user.is_blacklisted ? 'Blacklisted' : 'Active'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex space-x-2">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleBlacklistToggle(user.id, user.is_blacklisted)}
                                                                className={user.is_blacklisted ? 'text-green-500' : 'text-red-500'}
                                                                disabled={user.id === users.find(u => u.role === 'admin')?.id} // Prevent blacklisting the first admin
                                                            >
                                                                {user.is_blacklisted ? (
                                                                    <><UserCheck className="h-4 w-4 mr-1" /> Un-blacklist</>
                                                                ) : (
                                                                    <><UserX className="h-4 w-4 mr-1" /> Blacklist</>
                                                                )}
                                                            </Button>

                                                            {user.role === 'infrastructure_manager' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => openManagerDialog(user)}
                                                                    className="text-blue-500"
                                                                >
                                                                    <Shield className="h-4 w-4 mr-1" /> Manage Access
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    <div className="text-gray-400">
                                                        {users.length > 0
                                                            ? 'No users match your search criteria.'
                                                            : 'No users found.'}
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

                {/* Infrastructure assignment dialog */}
                {selectedUser && (
                    <Dialog open={isManagerDialogOpen} onOpenChange={setIsManagerDialogOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Manage Infrastructure Access</DialogTitle>
                                <DialogDescription>
                                    Assign or remove infrastructure access for {selectedUser.name}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="py-4">
                                <p className="text-sm text-gray-400 mb-4">
                                    Toggle access to each infrastructure below:
                                </p>

                                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                                    {infrastructures.map((infra) => {
                                        const isAssigned = assignedInfrastructures.includes(infra.id);

                                        return (
                                            <div key={infra.id} className="flex items-center justify-between py-2 border-b border-gray-700">
                                                <div>
                                                    <p className="font-medium">{infra.name}</p>
                                                    {infra.location && (
                                                        <p className="text-xs text-gray-400">{infra.location}</p>
                                                    )}
                                                </div>
                                                <Switch
                                                    checked={isAssigned}
                                                    onCheckedChange={(checked) => handleInfrastructureToggle(infra.id, checked)}
                                                />
                                            </div>
                                        );
                                    })}

                                    {infrastructures.length === 0 && (
                                        <p className="text-center text-gray-400">No infrastructures available</p>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button onClick={() => setIsManagerDialogOpen(false)}>
                                    Done
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </Card>
    );
};

export default UserManagement;