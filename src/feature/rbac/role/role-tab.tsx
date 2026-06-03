import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ColumnDef, SortingState } from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Shield, Plus, Edit, Trash2, Lock, Info } from 'lucide-react';
import { format } from 'date-fns';

import { getRolesList, getModulesPermissions, getRoleByName, createRole, updateRole, deleteRole } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { roleFormSchema } from '../rbac.schema.ts';
import type { TRoleFormSchema, Scope } from '../rbac.schema.ts';
import type { RoleTabProps, IRoleListItem } from '../rbac.types';
import DataTable from '#/components/data-table/data-table.tsx';
import { useDebounce } from '#/hooks/use-debounce.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '#/components/ui/card.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

export default function RoleTab({ page, pageSize, search, status, onPaginationChange, onSearchChange, onStatusChange }: RoleTabProps) {
    const queryClient = useQueryClient();
    const [sorting, setSorting] = React.useState<SortingState>([]);

    const [localSearch, setLocalSearch] = React.useState(search || '');
    const debouncedSearch = useDebounce(localSearch, 400);

    React.useEffect(() => {
        setLocalSearch(search || '');
    }, [search]);

    React.useEffect(() => {
        onSearchChange(debouncedSearch);
    }, [debouncedSearch, onSearchChange]);

    // Dialog / Form States
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [editingRole, setEditingRole] = React.useState<IRoleListItem | null>(null);
    const [isFetchingDetails, setIsFetchingDetails] = React.useState(false);

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

    // 2. Modules Permissions Tree Query (Pre-fetched for selection tree in dialog)
    const { data: treeData, isLoading: isTreeLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.MODULES_PERMISSIONS],
        queryFn: getModulesPermissions,
        enabled: isDialogOpen // Only fetch when dialog opens
    });

    // 3. Form Setup
    const form = useForm<TRoleFormSchema>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            name: '',
            description: '',
            permissions: []
        }
    });

    // 4. Mutations
    const createMutation = useMutation({
        mutationFn: createRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.RBAC.ROLES_LIST] });
            toast.success('Custom Role Created', {
                description: 'The new role and permission scopes have been successfully configured.'
            });
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error('Failed to create role', {
                description: getErrorMessage(error)
            });
        }
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => updateRole(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.RBAC.ROLES_LIST] });
            toast.success('Role Updated Successfully', {
                description: 'The role mappings and permission tree have been successfully updated.'
            });
            setIsDialogOpen(false);
        },
        onError: (error) => {
            toast.error('Failed to update role', {
                description: getErrorMessage(error)
            });
        }
    });

    const deleteMutation = useMutation({
        mutationFn: deleteRole,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.RBAC.ROLES_LIST] });
            toast.success('Role Deleted Successfully', {
                description: 'The custom role has been soft-deleted.'
            });
            setIsDeleteOpen(false);
        },
        onError: (error) => {
            toast.error('Failed to delete role', {
                description: getErrorMessage(error)
            });
            setIsDeleteOpen(false);
        }
    });

    // 5. Actions Handlers
    const handleOpenCreate = () => {
        setEditingRole(null);
        form.reset({
            name: '',
            description: '',
            permissions: []
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = async (role: IRoleListItem) => {
        setIsFetchingDetails(true);
        try {
            const details = await getRoleByName(role.name);
            setEditingRole(role);

            // Map incoming API permissions tree back into the flat Zod format for react-hook-form
            const mappedPermissions = details.rolePermissions.map((rp: any) => ({
                modulePermissionId: rp.modulePermission.id,
                scope: rp.modulePermission.accessScope
            }));

            form.reset({
                name: details.name,
                description: details.description || '',
                permissions: mappedPermissions
            });

            setIsDialogOpen(true);
        } catch (error) {
            toast.error('Failed to load role details', {
                description: getErrorMessage(error)
            });
        } finally {
            setIsFetchingDetails(false);
        }
    };

    const handleOpenDelete = (role: IRoleListItem) => {
        setRoleToDelete(role);
        setIsDeleteOpen(true);
    };

    const onSubmit = (values: TRoleFormSchema) => {
        if (editingRole) {
            updateMutation.mutate({
                id: editingRole.id,
                payload: {
                    name: values.name,
                    description: values.description,
                    permissions: values.permissions
                }
            });
        } else {
            createMutation.mutate(values);
        }
    };

    // 6. Checkbox Permissions Tree helpers
    // Form permissions: { modulePermissionId: string, scope: 'ALL' | 'STORE' | 'OWN' }[]
    const currentPermissions = form.watch('permissions');

    const handlePermissionToggle = (checked: boolean, modulePermissions: { modulePermissionId: string; scope: 'ALL' | 'STORE' | 'OWN' }[]) => {
        const idsToFilter = modulePermissions.map((mp) => mp.modulePermissionId);

        // Remove previous mappings for this action node
        const filtered = currentPermissions.filter((p) => !idsToFilter.includes(p.modulePermissionId));

        if (checked) {
            // Find the most permissive scope or first available one, default to it
            const defaultScope = modulePermissions.find((mp) => mp.scope === 'ALL') || modulePermissions[0];
            form.setValue('permissions', [
                ...filtered,
                {
                    modulePermissionId: defaultScope.modulePermissionId,
                    scope: defaultScope.scope
                }
            ]);
        } else {
            form.setValue('permissions', filtered);
        }
    };

    const handleScopeChange = (
        newScope: 'ALL' | 'STORE' | 'OWN',
        modulePermissions: { modulePermissionId: string; scope: 'ALL' | 'STORE' | 'OWN' }[]
    ) => {
        const idsToFilter = modulePermissions.map((mp) => mp.modulePermissionId);

        // Filter out existing mapping
        const filtered = currentPermissions.filter((p) => !idsToFilter.includes(p.modulePermissionId));

        // Find the specific modulePermissionId for this selected scope
        const matched = modulePermissions.find((mp) => mp.scope === newScope);
        if (matched) {
            form.setValue('permissions', [
                ...filtered,
                {
                    modulePermissionId: matched.modulePermissionId,
                    scope: matched.scope
                }
            ]);
        }
    };

    // Helper to determine if a permission node (e.g. read permission for Users module) is active,
    // and what the active scope is.
    const getActiveNodeState = (modulePermissions: { modulePermissionId: string; scope: 'ALL' | 'STORE' | 'OWN' }[]) => {
        const ids = modulePermissions.map((mp) => mp.modulePermissionId);
        const activeItem = currentPermissions.find((p) => ids.includes(p.modulePermissionId));
        return {
            checked: !!activeItem,
            scope: activeItem ? activeItem.scope : undefined
        };
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
                    const isSystem = row.original.isSystem;
                    const isCustomer = row.original.name.toLowerCase() === 'customer';

                    if (isSystem || isCustomer) {
                        return (
                            <div className="flex items-center gap-1 text-muted-foreground/50 text-xs font-semibold">
                                <Lock className="size-3.5 mr-1" />
                                Locked
                            </div>
                        );
                    }

                    return (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-primary transition-colors"
                                onClick={() => handleOpenEdit(row.original)}
                                disabled={isFetchingDetails}
                            >
                                <Edit className="size-4" />
                                <span className="sr-only">Edit Role</span>
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-muted-foreground hover:text-destructive transition-colors"
                                onClick={() => handleOpenDelete(row.original)}
                            >
                                <Trash2 className="size-4" />
                                <span className="sr-only">Delete Role</span>
                            </Button>
                        </div>
                    );
                }
            }
        ],
        [isFetchingDetails]
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
                        <Button onClick={handleOpenCreate} className="h-9 gap-1.5 shadow-sm">
                            <Plus className="size-4" />
                            Create Role
                        </Button>
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
                isLoading={isRolesLoading || isFetchingDetails}
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

            {/* CREATE / EDIT ROLE DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                    <DialogHeader className="px-6 pt-6 pb-2">
                        <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                            <Shield className="size-5 text-primary" />
                            {editingRole ? `Edit Role: ${editingRole.name}` : 'Configure New Custom Role'}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define the name, functional description, and configure modular nested permission scopes.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Dialog Form Container */}
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                            {/* Scrollable Form Body */}
                            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Role Name</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="e.g. Cafe Manager, Senior Barista"
                                                        {...field}
                                                        disabled={!!editingRole} // Name is immutable on update via integrations lookup
                                                        className="h-9 bg-background/50"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <FormField
                                        control={form.control}
                                        name="description"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Description</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="Detailed role responsibilities..."
                                                        {...field}
                                                        className="h-9 bg-background/50"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                {/* Dynamic Modules Checklist Tree */}
                                <div className="space-y-3 pt-2">
                                    <div className="flex items-center justify-between border-b pb-2">
                                        <h3 className="text-sm font-bold tracking-tight text-foreground/80">Access Control Selection Tree</h3>
                                        <span className="text-[10px] text-muted-foreground font-medium">
                                            Toggle permissions and adjust access scope limits.
                                        </span>
                                    </div>

                                    {isTreeLoading ? (
                                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                                            <Spinner className="h-6 w-6 text-primary animate-spin" />
                                            <span className="text-xs text-muted-foreground font-medium">Assembling selection tree...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {treeData?.map((module: any) => (
                                                <Card
                                                    key={module.moduleId}
                                                    className="border border-border/60 bg-muted/25 hover:bg-muted/40 transition-all py-4"
                                                >
                                                    <CardHeader className="py-0 px-4 pb-2 border-b border-border/40">
                                                        <CardTitle className="text-sm font-bold text-foreground/95 capitalize">
                                                            {module.moduleName}
                                                        </CardTitle>
                                                        <CardDescription className="text-[10px]">
                                                            Operational modules mapped to security boundaries.
                                                        </CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="px-4 pt-3 pb-0">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                            {module.permissions.map((perm: any) => {
                                                                // Extract the specific modulePermissions scope items
                                                                const mpOptions = perm.modulePermissions.map((mp: any) => ({
                                                                    modulePermissionId: mp.modulePermissionId,
                                                                    scope: mp.scope
                                                                }));

                                                                const { checked, scope } = getActiveNodeState(mpOptions);

                                                                return (
                                                                    <div
                                                                        key={perm.permissionId}
                                                                        className="flex items-center justify-between p-2 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors border-border/40"
                                                                    >
                                                                        <div className="flex items-center gap-2.5">
                                                                            <Checkbox
                                                                                id={perm.permissionId}
                                                                                checked={checked}
                                                                                onCheckedChange={(val) => handlePermissionToggle(!!val, mpOptions)}
                                                                            />
                                                                            <label
                                                                                htmlFor={perm.permissionId}
                                                                                className="text-xs font-semibold capitalize cursor-pointer select-none text-foreground/90"
                                                                            >
                                                                                {perm.permissionName}
                                                                            </label>
                                                                        </div>

                                                                        {checked && (
                                                                            <Select
                                                                                value={scope}
                                                                                onValueChange={(val) => handleScopeChange(val as Scope, mpOptions)}
                                                                            >
                                                                                <SelectTrigger className="h-7 w-[100px] text-[11px] font-semibold border-dashed py-0">
                                                                                    <SelectValue placeholder="Scope" />
                                                                                </SelectTrigger>
                                                                                <SelectContent position="popper" align="end">
                                                                                    {mpOptions.map((opt: any) => (
                                                                                        <SelectItem
                                                                                            key={opt.modulePermissionId}
                                                                                            value={opt.scope}
                                                                                            className="text-[11px] font-semibold"
                                                                                        >
                                                                                            Scope: {opt.scope}
                                                                                        </SelectItem>
                                                                                    ))}
                                                                                </SelectContent>
                                                                            </Select>
                                                                        )}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dialog Footer Actions */}
                            <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)} className="h-9">
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="h-9">
                                    {createMutation.isPending || updateMutation.isPending ? (
                                        <div className="flex items-center gap-1">
                                            <Spinner className="h-4 w-4" />
                                            Saving...
                                        </div>
                                    ) : editingRole ? (
                                        'Save Updates'
                                    ) : (
                                        'Create Role'
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>

            {/* DELETE CONFIRMATION DIALOG */}
            <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
                <DialogContent className="max-w-md bg-background p-6">
                    <DialogHeader className="space-y-2">
                        <DialogTitle className="flex items-center gap-2 text-destructive font-bold">
                            <Trash2 className="size-5" />
                            Delete Role Confirmation
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Are you absolutely sure you want to soft-delete the custom role{' '}
                            <strong className="text-foreground">"{roleToDelete?.name}"</strong>? This will instantly remove its associated nested
                            operational permissions.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Banner Alerts */}
                    <div className="my-3 flex items-start gap-2.5 p-3 rounded-lg border border-warning/20 bg-warning/5 text-xs text-warning-foreground font-medium">
                        <Info className="size-4 shrink-0 text-warning mt-0.5" />
                        <span>
                            This operation is reversible in database support, but custom access settings will be revoked from staff members mapping
                            this role.
                        </span>
                    </div>

                    <DialogFooter className="mt-4 gap-2">
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} className="h-9" disabled={deleteMutation.isPending}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                if (roleToDelete) deleteMutation.mutate(roleToDelete.id);
                            }}
                            className="h-9"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <div className="flex items-center gap-1">
                                    <Spinner className="h-4 w-4" />
                                    Deleting...
                                </div>
                            ) : (
                                'Confirm Delete'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
