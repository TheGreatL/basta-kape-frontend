import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { Plus, Edit, Trash2, Lock, Eye } from 'lucide-react';
import { format } from 'date-fns';

import { getRolesList } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import type { RoleTabProps, IRoleListItem } from '../rbac.types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';
import { RequirePermission } from '#/components/rbac/require-permission.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import RoleCreateDialog from './role-create-dialog.tsx';
import RoleEditDialog from './role-edit-dialog.tsx';
import RoleViewDialog from './role-view-dialog.tsx';
import RoleDeleteDialog from './role-delete-dialog.tsx';

export default function RoleTab({ page, pageSize, search, status, onPaginationChange, onSearchChange, onStatusChange }: RoleTabProps) {
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        onSearchChange(debouncedSearch);
    }, [debouncedSearch, onSearchChange]);

    // Dialog States
    const [actionType, setActionType] = React.useState<'create' | 'edit' | 'view' | null>(null);
    const [selectedRole, setSelectedRole] = React.useState<IRoleListItem | null>(null);

    // Delete Confirmation dialog states
    const [roleToDelete, setRoleToDelete] = React.useState<IRoleListItem | null>(null);
    const [isDeleteOpen, setIsDeleteOpen] = React.useState(false);

    // 1. Roles Query
    const { data: rolesData, isLoading: isRolesLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.ROLES_LIST, { page, pageSize, search, status }],
        queryFn: async () => {
            return getRolesList({
                page,
                limit: pageSize,
                search,
                status
            });
        }
    });

    // Actions Handlers
    const handleOpenCreate = () => {
        setSelectedRole(null);
        setActionType('create');
    };

    const handleOpenEdit = (role: IRoleListItem) => {
        setSelectedRole(role);
        setActionType('edit');
    };

    const handleOpenView = (role: IRoleListItem) => {
        setSelectedRole(role);
        setActionType('view');
    };

    const handleOpenDelete = (role: IRoleListItem) => {
        setRoleToDelete(role);
        setIsDeleteOpen(true);
    };

    // Columns Definition
    const columns = React.useMemo<ColumnDef<IRoleListItem>[]>(
        () => [
            {
                accessorKey: 'name',
                header: 'Role Name',
                cell: ({ row }) => (
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground/90">{row.getValue('name')}</span>
                        {row.original.isSystem && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                                <Lock className="size-2.5" />
                                System
                            </span>
                        )}
                    </div>
                )
            },
            {
                accessorKey: 'description',
                header: 'Description',
                cell: ({ row }) => (
                    <span className="text-muted-foreground font-normal whitespace-pre-wrap max-w-sm block">
                        {row.getValue('description') || 'No description provided.'}
                    </span>
                )
            },
            {
                accessorKey: 'createdAt',
                header: 'Date Created',
                cell: ({ row }) => format(new Date(row.getValue('createdAt')), 'MMM d, yyyy')
            },
            {
                id: 'actions',
                header: 'Actions',
                cell: ({ row }) => {
                    const isCustomer = row.original.name.toLowerCase() === 'customer';

                    return (
                        <div className="flex items-center gap-2">
                            <RequirePermission module="Roles and Permissions" action="read">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                    onClick={() => handleOpenView(row.original)}
                                >
                                    <Eye className="size-4" />
                                    <span className="sr-only">View Role</span>
                                </Button>
                            </RequirePermission>
                            {!isCustomer && (
                                <>
                                    <RequirePermission module="Roles and Permissions" action="update">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                            onClick={() => handleOpenEdit(row.original)}
                                        >
                                            <Edit className="size-4" />
                                            <span className="sr-only">Edit Role</span>
                                        </Button>
                                    </RequirePermission>
                                    <RequirePermission module="Roles and Permissions" action="delete">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                            onClick={() => handleOpenDelete(row.original)}
                                        >
                                            <Trash2 className="size-4" />
                                            <span className="sr-only">Delete Role</span>
                                        </Button>
                                    </RequirePermission>
                                </>
                            )}
                        </div>
                    );
                }
            }
        ],
        []
    );

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h2 className="text-lg font-bold tracking-tight text-foreground/90">Configured Roles</h2>
                    <p className="text-xs text-muted-foreground">
                        Configure functional user roles, custom permissions, and nested access scope boundaries.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {status === 'active' && (
                        <RequirePermission module="Roles and Permissions" action="create">
                            <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm">
                                <Plus className="size-4" />
                                Create Role
                            </Button>
                        </RequirePermission>
                    )}
                </div>
            </div>

            {/* Main Roles Table */}
            <DataTable
                columns={columns}
                data={rolesData?.data || []}
                pageCount={rolesData?.meta.pageCount || 1}
                pageIndex={page - 1}
                pageSize={pageSize}
                onPaginationChange={(idx, size) => onPaginationChange(idx + 1, size)}
                sorting={sorting}
                onSortingChange={setSorting}
                showColumnVisibilityToggle={true}
                isLoading={isRolesLoading}
                filterContent={
                    <>
                        <Input
                            placeholder="Search roles by name or description..."
                            value={localSearch}
                            onChange={(e) => setLocalSearch(e.target.value)}
                            className="h-9 w-full sm:w-[300px] bg-background/50"
                        />
                        <Select value={status} onValueChange={(val) => onStatusChange(val as 'active' | 'archive')}>
                            <SelectTrigger className="h-9 min-w-[140px] bg-background/50 hover:bg-background/80 capitalize">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent position="popper" align="start" className="capitalize">
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="archive">Archived</SelectItem>
                            </SelectContent>
                        </Select>
                    </>
                }
            />

            {isRolesLoading ? null : (
                <>
                    {/* CREATE DIALOG */}
                    <RoleCreateDialog open={actionType === 'create'} onOpenChange={(val) => !val && setActionType(null)} />

                    {/* EDIT DIALOG */}
                    <RoleEditDialog open={actionType === 'edit'} onOpenChange={(val) => !val && setActionType(null)} role={selectedRole} />

                    {/* VIEW DIALOG */}
                    <RoleViewDialog open={actionType === 'view'} onOpenChange={(val) => !val && setActionType(null)} role={selectedRole} />

                    {/* DELETE CONFIRMATION DIALOG */}
                    <RoleDeleteDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen} role={roleToDelete} />
                </>
            )}
        </div>
    );
}
