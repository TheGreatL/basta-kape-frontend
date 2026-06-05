import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

import { getModulesPermissions, getRoleByName, updateRole } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { roleFormSchema } from '../rbac.schema.ts';
import type { TRoleFormSchema } from '../rbac.schema.ts';
import type { IRoleListItem } from '../rbac.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RolePermissionTree } from './components/role-permission-tree.tsx';
import { RoleAuditCard } from './components/role-audit-card.tsx';

interface RoleEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    role: IRoleListItem | null;
}

export default function RoleEditDialog({ open, onOpenChange, role }: RoleEditDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            const timer = setTimeout(() => setIsRendering(true), 50);
            return () => clearTimeout(timer);
        } else {
            setIsRendering(false);
        }
    }, [open]);

    const { data: treeData, isLoading: isTreeLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.MODULES_PERMISSIONS],
        queryFn: getModulesPermissions,
        enabled: open
    });

    const { data: roleDetails, isLoading: isRoleDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.ROLE_DETAILS, role?.name],
        queryFn: () => getRoleByName(role!.name),
        enabled: open && !!role?.name
    });

    const form = useForm<TRoleFormSchema>({
        resolver: zodResolver(roleFormSchema),
        defaultValues: {
            name: '',
            description: '',
            permissions: []
        }
    });

    React.useEffect(() => {
        if (!open) {
            form.reset({ name: '', description: '', permissions: [] });
            return;
        }

        if (roleDetails) {
            const mappedPermissions = roleDetails.rolePermissions.map((rp: any) => ({
                modulePermissionId: rp.modulePermission.id,
                scope: rp.modulePermission.accessScope
            }));
            form.reset({
                name: roleDetails.name,
                description: roleDetails.description || '',
                permissions: mappedPermissions
            });
        }
    }, [open, roleDetails, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => updateRole(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.RBAC.ROLES_LIST] });
            toast.success('Role Updated Successfully', {
                description: 'The role mappings and permission tree have been successfully updated.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update role', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: TRoleFormSchema) => {
        if (!role) return;
        updateMutation.mutate({
            id: role.id,
            payload: values
        });
    };

    const currentPermissions = form.watch('permissions');
    const isLoading = isTreeLoading || isRoleDetailsLoading || !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Shield className="size-5 text-primary" />
                        Edit Role: {role?.name}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Define the name, functional description, and configure modular nested permission scopes.
                    </DialogDescription>
                </DialogHeader>

                {roleDetails && <RoleAuditCard role={roleDetails} />}

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading role configurations...</span>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Role Name</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            disabled
                                                            placeholder="e.g. Cafe Manager, Senior Barista"
                                                            {...field}
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
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <h3 className="text-sm font-bold text-foreground/80">Access Control Selection Tree</h3>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                Toggle permissions and adjust access scope limits.
                                            </span>
                                        </div>
                                        <RolePermissionTree
                                            treeData={treeData}
                                            currentPermissions={currentPermissions}
                                            onPermissionChange={(permissions) => form.setValue('permissions', permissions, { shouldDirty: true })}
                                        />
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={updateMutation.isPending || isLoading} className="h-9">
                                {updateMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Save Updates'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
