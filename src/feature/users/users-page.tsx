import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';

import { Route } from '#/routes/admin/users.tsx';
import { getUsersList } from '#/api/users.api.ts';
import { getRolesList } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { IUserListItem } from './users.types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';
import { Avatar, AvatarImage, AvatarFallback } from '#/components/ui/avatar.tsx';
import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';

import UserCreateDialog from './components/user-create-dialog.tsx';
import UserEditDialog from './components/user-edit-dialog.tsx';
import UserViewDialog from './components/user-view-dialog.tsx';
import UserDeleteDialog from './components/user-delete-dialog.tsx';
import { getFileUrl } from '#/utils/helper.ts';

export default function UsersPage() {
    const navigate = useNavigate({ from: '/admin/users' });
    const { page, pageSize, search, status, role } = Route.useSearch();

    const [sorting, setSorting] = React.useState<SortingState>([]);
    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    const setSearchParams = (updates: Record<string, any>) => {
        navigate({
            search: (prev: any) => ({ ...prev, ...updates })
        });
    };

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        if (debouncedSearch !== (search || '')) {
            setSearchParams({ search: debouncedSearch, page: 1 });
        }
    }, [debouncedSearch, search]);

    // Dialog States
    const [actionType, setActionType] = React.useState<'create' | 'edit' | 'view' | null>(null);
    const [selectedUser, setSelectedUser] = React.useState<IUserListItem | null>(null);

    // Delete Confirmation states
    const [userToDelete, setUserToDelete] = React.useState<IUserListItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    // 1. Fetch Users List
    const { data: usersData, isLoading: isUsersLoading } = useQuery({
        queryKey: [QUERY_KEY.USERS.USERS_LIST, { page, pageSize, search, status, role }],
        queryFn: () =>
            getUsersList({
                page,
                limit: pageSize,
                search,
                status,
                role: role || undefined
            })
    });

    const handleOpenCreate = () => {
        setSelectedUser(null);
        setActionType('create');
    };

    const handleOpenEdit = (user: IUserListItem) => {
        setSelectedUser(user);
        setActionType('edit');
    };

    const handleOpenView = (user: IUserListItem) => {
        setSelectedUser(user);
        setActionType('view');
    };

    const handleOpenDelete = (user: IUserListItem) => {
        setUserToDelete(user);
        setIsDeleteOpen(true);
    };

    // Table Columns definition
    const columns = React.useMemo<ColumnDef<IUserListItem>[]>(
        () => [
            {
                accessorKey: 'firstName',
                header: 'Staff Profile',
                cell: ({ row }) => {
                    const initials = `${row.original.firstName[0] || ''}${row.original.lastName[0] || ''}`.toUpperCase();
                    return (
                        <div className="flex items-center gap-3">
                            <Avatar className="size-9 border border-border/80 shadow-xs">
                                <AvatarImage src={getFileUrl(row.original.profilePhoto || undefined)} className="object-cover" />
                                <AvatarFallback className="font-semibold text-xs bg-primary/10 text-primary">{initials || 'US'}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <span className="font-semibold text-foreground/90 leading-tight">
                                    {row.original.firstName} {row.original.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground font-medium">
                                    @{row.original.username} • {row.original.email}
                                </span>
                            </div>
                        </div>
                    );
                }
            },
            {
                accessorKey: 'userRoles',
                header: 'Role Assignments',
                cell: ({ row }) => (
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {row.original.userRoles.map((ur) => (
                            <span
                                key={ur.role.id}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 capitalize"
                            >
                                {ur.role.name}
                            </span>
                        ))}
                        {row.original.userRoles.length === 0 && <span className="text-xs text-muted-foreground font-normal italic">No Roles</span>}
                    </div>
                )
            },
            {
                accessorKey: 'phoneNumber',
                header: 'Phone Number',
                cell: ({ row }) => <span className="text-xs font-medium text-foreground/80">{row.original.phoneNumber || '—'}</span>
            },
            {
                accessorKey: 'createdAt',
                header: 'Date Configured',
                cell: ({ row }) => <span className="text-xs text-muted-foreground">{format(new Date(row.original.createdAt), 'MMM d, yyyy')}</span>
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <RequirePermission module="Users Management" action="read">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => handleOpenView(row.original)}
                            >
                                <Eye className="size-4" />
                                <span className="sr-only">View User</span>
                            </Button>
                        </RequirePermission>
                        {row.original.userRoles.find((rl) => rl.role.name.toLowerCase() === 'customer') ? null : (
                            <RequirePermission module="Users Management" action="update">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={() => handleOpenEdit(row.original)}
                                >
                                    <Edit className="size-4" />
                                    <span className="sr-only">Edit User</span>
                                </Button>
                            </RequirePermission>
                        )}
                        <RequirePermission module="Users Management" action="delete">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => handleOpenDelete(row.original)}
                            >
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete User</span>
                            </Button>
                        </RequirePermission>
                    </div>
                )
            }
        ],
        []
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold text-foreground/90 flex items-center gap-2">Users & Staff Directory</h2>
                    <p className="text-xs text-muted-foreground">
                        Manage employee profiles, credentials, role assignments, and check active system staff accounts.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <RequirePermission module="Users Management" action="create">
                        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Create User
                        </Button>
                    </RequirePermission>
                </div>
            </div>

            {/* Main Users Table */}
            <DataTable
                columns={columns}
                data={usersData?.data || []}
                pageCount={usersData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => setSearchParams({ page: idx + 1, pageSize: size })}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isUsersLoading}
                filterContent={
                    <>
                        <Input
                            placeholder="Search users..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[250px] bg-background/50"
                        />
                        <Select value={status} onValueChange={(val) => setSearchParams({ status: val as 'active' | 'archive', page: 1 })}>
                            <SelectTrigger className="h-9 min-w-[130px] bg-background/50 hover:bg-background/80 capitalize">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start" className="capitalize">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archive">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                        <InfiniteSelect<any, string>
                            queryKey={[QUERY_KEY.RBAC.ROLES_LIST]}
                            fetchFn={({ pageParam = 1, query }) => getRolesList({ page: pageParam, limit: 10, search: query, status: 'active' })}
                            getItems={(res) => res.data}
                            getNextPageParam={(lastPage) => (lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined)}
                            initialPageParam={1}
                            value={role || undefined}
                            onChange={(val) => setSearchParams({ role: val || '', page: 1 })}
                            getOptionValue={(item) => item.name}
                            getOptionLabel={(item) => item.name}
                            selectedItem={role ? { id: role, name: role } : undefined}
                            placeholder="All Roles"
                            searchPlaceholder="Search roles..."
                            className="h-9 w-full sm:w-[150px] bg-background/50 hover:bg-background/80 capitalize"
                        />
                    </>
                }
            />

            {/* CREATE DIALOG */}
            <UserCreateDialog open={actionType === 'create'} onOpenChange={(val) => !val && setActionType(null)} />

            {/* EDIT DIALOG */}
            <UserEditDialog open={actionType === 'edit'} onOpenChange={(val) => !val && setActionType(null)} user={selectedUser} />

            {/* VIEW DIALOG */}
            <UserViewDialog open={actionType === 'view'} onOpenChange={(val) => !val && setActionType(null)} user={selectedUser} />

            {/* DELETE CONFIRMATION DIALOG */}
            <UserDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} user={userToDelete} />
        </div>
    );
}
