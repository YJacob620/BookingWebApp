import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, UserCheck, UserX, Shield } from 'lucide-react';
import { TableCell } from '@/components/ui/table';
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
import { Checkbox } from '@/components/ui/checkbox';
import {
    fetchUsers,
    updateUserRole,
    toggleUserBlacklist,
    fetchInfrastructures,
    assignInfrastructureToManager,
    removeInfrastructureFromManager,
    fetchUserInfrastructures,
    User,
    Infrastructure,
    UserRole,
    Message,
    SortConfig
} from '@/utils';
import BasePageLayout from '@/components/_BasePageLayout';
import PaginatedTable, { PaginatedTableColumn } from '@/components/_PaginatedTable';
import { useTranslation } from 'react-i18next';


const UserManagement: React.FC = () => {

    // State management
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [message, setMessage] = useState<Message | null>(null);
    const [infrastructures, setInfrastructures] = useState<Infrastructure[]>([]);
    const [sortConfig, setSortConfig] = useState<SortConfig<User>>({ key: 'name', direction: 'asc' });

    // Dialog state
    const [isManagerDialogOpen, setIsManagerDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [assignedInfrastructures, setAssignedInfrastructures] = useState<number[]>([]);
    const [infraSearchQuery, setInfraSearchQuery] = useState('');
    const [isUpdatingAccess, setIsUpdatingAccess] = useState(false);
    const [pendingChanges, setPendingChanges] = useState<{ [key: number]: boolean }>({});
    const {t} = useTranslation();

    useEffect(() => {
        loadUsers();
        loadInfrastructures();
    }, []);

    useEffect(() => {
        filterUsers();
    }, [users, searchQuery]);

    const loadUsers = async () => {
        try {
            setIsLoading(true);
            const data = (await fetchUsers()).filter(user => user.role !== 'guest');
            setUsers(data);
        } catch (error) {
            console.error('Error loading users:', error);
            setMessage({
                type: 'error',
                text: t('userManagement.msgErrUserLoad','Failed to load users')
            });
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

    const handleRoleChange = async (userId: number, newRole: UserRole) => {
        try {
            await updateUserRole(userId, newRole);

            // Update local state
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, role: newRole } : user
                )
            );

            setMessage({
                type: 'success',
                text: t('userManagement.msgSuccessUpUserRole','User role updated successfully')
            });

            // If changing to/from infrastructure_manager, reload user data to get assigned infrastructures
            if (newRole === 'manager' ||
                users.find(u => u.id === userId)?.role === 'manager') {
                loadUsers();
            }

            // Clear success message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error updating user role:', error);
            setMessage({
                type: 'error',
                text: t('userManagement.msgErrUserUpdate','Failed to update user role')
            });

            setTimeout(() => setMessage(null), 3000);
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

            setMessage({
                type: 'success',
                text: `User ${!currentStatus ? 'blacklisted' : 'un-blacklisted'} successfully`
            });

            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error toggling blacklist status:', error);
            setMessage({
                type: 'error',
                text: t('userManagement.msgErrUpdateBlklstStatus','Failed to update blacklist status')
            });

            // Clear error message after 3 seconds
            setTimeout(() => setMessage(null), 3000);
        }
    };

    const openManagerDialog = async (user: User) => {
        setSelectedUser(user);
        setInfraSearchQuery('');
        setPendingChanges({});

        // Load assigned infrastructures for this manager
        try {
            // Use the admin version that takes a user ID parameter
            const data: Infrastructure[] = await fetchUserInfrastructures(user.id);
            setAssignedInfrastructures(data.map(infra => infra.id));
        } catch (error) {
            console.error('Error loading manager infrastructures:', error);
            setAssignedInfrastructures([]);
        }

        setIsManagerDialogOpen(true);
    };

    const handleInfrastructureToggle = async (infrastructureId: number, isAssigned: boolean) => {
        if (!selectedUser) return;

        // Track this change in the pending changes
        setPendingChanges(prev => ({
            ...prev,
            [infrastructureId]: isAssigned
        }));

        // Update the UI immediately
        if (isAssigned) {
            setAssignedInfrastructures(prev => [...prev, infrastructureId]);
        } else {
            setAssignedInfrastructures(prev => prev.filter(id => id !== infrastructureId));
        }
    };

    // Save all pending changes when dialog is closed
    const handleSaveChanges = async () => {
        if (!selectedUser || Object.keys(pendingChanges).length === 0) {
            setIsManagerDialogOpen(false);
            return;
        }

        setIsUpdatingAccess(true);

        try {
            // Process all pending changes
            const promises = Object.entries(pendingChanges).map(([infraId, isAssigned]) => {
                const infrastructureId = parseInt(infraId);
                if (isAssigned) {
                    return assignInfrastructureToManager(selectedUser.id, infrastructureId);
                } else {
                    return removeInfrastructureFromManager(selectedUser.id, infrastructureId);
                }
            });

            await Promise.all(promises);

            setMessage({
                type: 'success',
                text: t('userManagement.msgSuccsessInfAccessUpdate','Infrastructure access updated successfully')
            });

            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Error updating infrastructure assignments:', error);
            setMessage({
                type: 'error',
                text: t('userManagement.msgErrUpdateInfStatus','Failed to update some infrastructure assignments')
            });

            setTimeout(() => setMessage(null), 3000);
        } finally {
            setIsUpdatingAccess(false);
            setIsManagerDialogOpen(false);
            setPendingChanges({});
        }
    };

    // Filter infrastructures based on search query
    const filteredInfrastructures = infrastructures.filter(infra => {
        if (!infraSearchQuery) return true;

        const query = infraSearchQuery.toLowerCase();
        return (
            infra.name.toLowerCase().includes(query) ||
            (infra.location && infra.location.toLowerCase().includes(query)) ||
            (infra.description && infra.description.toLowerCase().includes(query))
        );
    });

    // Define columns for infrastructure table in dialog
    const infrastructureColumns: PaginatedTableColumn<Infrastructure>[] = [
        {
            key: 'access',
            header: t('Access'),
            cell: (infra: Infrastructure) => {
                const isAssigned = assignedInfrastructures.includes(infra.id);

                return (
                    <TableCell className="w-[80px] text-center">
                        <Checkbox
                            checked={isAssigned}
                            onCheckedChange={(checked) =>
                                handleInfrastructureToggle(infra.id, !!checked)
                            }
                            className="h-5 w-5"
                        />
                    </TableCell>
                );
            },
            className: 'text-center w-20',
            sortable: false
        },
        {
            key:  'name',
            header: t('Name'),
            cell: (infra: Infrastructure) => (
                <TableCell className="font-medium text-center">{infra.name}</TableCell>
            ),
            sortable: true
        },
        {
            key: 'location',
            header: t('Location'),
            cell: (infra: Infrastructure) => (
                <TableCell className="text-center">{infra.location || 'N/A'}</TableCell>
            ),
            sortable: true,
        },
        {
            key: 'status',
            header: t('Status'),
            cell: (infra: Infrastructure) => (
                <TableCell className="text-center">
                    <Badge className={infra.is_active ? 'bg-green-800' : 'bg-red-800'}>
                        {infra.is_active ? t('Active') : t('Inactive')}
                    </Badge>
                </TableCell>
            ),
            className: 'text-center',
            sortable: false
        }
    ];

    // Define columns for PaginatedTable of users
    const columns: PaginatedTableColumn<User>[] = [
        {
            key: 'name',
            header: t('Name'),
            cell: (user: User) => (
                <TableCell className="font-medium">{user.name}</TableCell>
            ),
            sortable: true
        },
        {
            key: 'email',
            header: t('Email'),
            cell: (user: User) => (
                <TableCell>{user.email}</TableCell>
            ),
            sortable: true
        },
        {
            key: 'role',
            header: t('Role'),
            cell: (user: User) => (
                <TableCell>
                    <Select
                        value={user.role}
                        onValueChange={(value: UserRole) => handleRoleChange(user.id, value)}
                        disabled={user.id === users.find(u => u.role === 'admin')?.id} // Prevent changing the first admin
                    >
                        <SelectTrigger className="w-40 h-12 text-left text-sm">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="admin">{t('Admin')}</SelectItem>
                            <SelectItem value="manager">{t('Infrastructure Manager')}</SelectItem>
                            <SelectItem value="faculty">{t('Faculty')}</SelectItem>
                            <SelectItem value="student">{t('Student')}</SelectItem>
                        </SelectContent>
                    </Select>
                </TableCell>
            ),
            sortable: true
        },
        {
            key: 'status',
            header: t('Status'),
            cell: (user: User) => (
                <TableCell>
                    <Badge className={user.is_blacklisted ? 'bg-red-700' : 'bg-green-700'}>
                        {user.is_blacklisted ? t('Blacklisted') : t('Allowed')}
                    </Badge>
                </TableCell>
            ),
            sortable: false
        },
        {
            key: 'actions',
            header: t('Actions'),
            cell: (user: User) => (
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
                                <><UserCheck className="h-4 w-4 mr-1" /> {t('userManagement.Un-blacklist')}</>
                            ) : (
                                <><UserX className="h-4 w-4 mr-1" /> {t('userManagement.Blacklist')}</>
                            )}
                        </Button>

                        {user.role === 'manager' && (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openManagerDialog(user)}
                                className="text-blue-500"
                            >
                                <Shield className="h-4 w-4 mr-1" /> {t('Manage Access')}
                            </Button>
                        )}
                    </div>
                </TableCell>
            ),
            sortable: false
        }
    ];

    // Handle sort change from PaginatedTable
    const handleSortChange = (newSortConfig: SortConfig<User>) => {
        setSortConfig(newSortConfig);
    };

    return (
        <BasePageLayout
            pageTitle={t('userManagement.title',"User Management")}
            showDashboardButton
            alertMessage={message}
        >
            {/* Search bar */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder={t('userManagement.searchBarPlaceholder',"Search users by name, email, or role...")}
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
                        <div className="text-center py-10">{t('Loading',{what:t('users')})}</div>
                    ) : (
                        <PaginatedTable
                            data={filteredUsers}
                            columns={columns}
                            initialRowsPerPage={10}
                            rowsPerPageOptions={[5, 10, 25, 50]}
                            emptyMessage={t('userManagement.No users found','No users found.')}
                            onSortChange={handleSortChange}
                            sortConfig={sortConfig}
                            noResults={
                                users.length > 0 ? (
                                    <div className="text-gray-400">
                                        {t('userManagement.searchNoResMsg','No users match your search criteria.')}
                                    </div>
                                ) : null
                            }
                        />
                    )}
                </CardContent>
            </Card>

            {/* Improved infrastructure assignment dialog */}
            {selectedUser && (
                <Dialog open={isManagerDialogOpen} onOpenChange={(open) => {
                    if (!open) {
                        // When closing the dialog, check if there are pending changes
                        if (Object.keys(pendingChanges).length > 0) {
                            handleSaveChanges();
                        } else {
                            setIsManagerDialogOpen(false);
                        }
                    } else {
                        setIsManagerDialogOpen(open);
                    }
                }}>
                    <DialogContent className="!max-w-3xl">
                        <DialogHeader>
                            <DialogTitle>{t('userManagement.manInfAccTitle','Manage Infrastructure Access')}</DialogTitle>
                            <DialogDescription>
                                {t('userManagement.manInfAccDesc',{who:selectedUser.name})}
                                {/* Assign or remove infrastructure access for {{who}} */}
                            </DialogDescription>
                        </DialogHeader>

                        <div className="py-2">
                            {/* Search bar for infrastructures */}
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder={t("Search infrastructures","Search infrastructures...")}
                                    value={infraSearchQuery}
                                    onChange={(e) => setInfraSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>

                            {/* Infrastructure table with pagination */}
                            <div className="max-h-[400px]">
                                <PaginatedTable
                                    data={filteredInfrastructures}
                                    columns={infrastructureColumns}
                                    initialRowsPerPage={5}
                                    rowsPerPageOptions={[3, 5, 10, 25]}
                                    emptyMessage={t('userManagement.noInfAbleMsg',"No infrastructures available")}
                                    noResults={
                                        infrastructures.length > 0 ? (
                                            <div className="text-gray-400">
                                                {t('userManagement.noInfResMsg','No infrastructures match your search criteria.')}
                                            </div>
                                        ) : null
                                    }
                                    tableClassName="min-w-full"
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <div className="flex justify-between w-full">
                                <div>
                                    {Object.keys(pendingChanges).length > 0 && (
                                        <span className="text-sm text-amber-400">
                                            {Object.keys(pendingChanges).length} {t('pending changes')}
                                        </span>
                                    )}
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => {
                                            setPendingChanges({});
                                            setIsManagerDialogOpen(false);
                                        }}
                                        className='max-w-15 discard'
                                    >
                                        {t('Cancel')}
                                    </Button>
                                    <Button
                                        onClick={handleSaveChanges}
                                        disabled={isUpdatingAccess || Object.keys(pendingChanges).length === 0}
                                        className='apply'
                                    >
                                        {isUpdatingAccess ? t('Saving','Saving...') : t('Save Changes')}
                                    </Button>
                                </div>
                            </div>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </BasePageLayout>
    );
};

export default UserManagement;