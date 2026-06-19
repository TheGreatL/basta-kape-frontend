import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Shield, ArrowLeft } from 'lucide-react';
import { useNavigate } from '@tanstack/react-router';

import { getModulesPermissions, getRoleByName, updateRole } from '#/api/rbac.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { roleFormSchema } from '../rbac.schema.ts';
import type { TRoleFormSchema } from '../rbac.schema.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { RolePermissionTree } from './components/role-permission-tree.tsx';
import { RoleAuditCard } from './components/role-audit-card.tsx';

interface RoleDetailPageProps {
    slug: string;
}

export default function RoleDetailPage({ slug }: RoleDetailPageProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const permissions = getUserPermissions(user);
    const canUpdate = hasPermission(permissions, 'Roles and Permissions', 'update');

    const [isRendering, setIsRendering] = React.useState(false);

    React.useEffect(() => {
        const timer = setTimeout(() => setIsRendering(true), 50);
        return () => clearTimeout(timer);
    }, []);

    const { data: treeData, isLoading: isTreeLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.MODULES_PERMISSIONS],
        queryFn: getModulesPermissions,
        staleTime: Infinity
    });

    const {
        data: roleDetails,
        isLoading: isRoleDetailsLoading,
        error: roleError
    } = useQuery({
        queryKey: [QUERY_KEY.RBAC.ROLE_DETAILS, slug],
        queryFn: () => getRoleByName(slug),
        staleTime: 30 * 1000
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
    }, [roleDetails, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: any }) => updateRole(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.RBAC.ROLES_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.RBAC.ROLE_DETAILS, slug] });
            toast.success('Role Updated Successfully', {
                description: 'The role mappings and permission tree have been successfully updated.'
            });
            navigate({ to: '/admin/roles' });
        },
        onError: (error) => {
            toast.error('Failed to update role', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: TRoleFormSchema) => {
        if (!roleDetails) return;
        updateMutation.mutate({
            id: roleDetails.id,
            payload: values
        });
    };

    const currentPermissions = form.watch('permissions');
    const isLoading = isTreeLoading || isRoleDetailsLoading || !isRendering;

    // Check if editing is disabled (e.g. read-only mode or if the role is Customer)
    const isCustomer = slug.toLowerCase() === 'customer';
    const isEditDisabled = !canUpdate || isCustomer;

    if (roleError) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Shield className="h-12 w-12 text-destructive" />
                <h2 className="text-lg font-bold text-foreground">Role Not Found</h2>
                <p className="text-sm text-muted-foreground">The role "{slug}" could not be loaded or does not exist.</p>
                <Button onClick={() => navigate({ to: '/admin/roles' })} className="mt-2">
                    Back to Roles
                </Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <Button
                    variant="ghost"
                    size="sm"
                    className="w-fit gap-1 text-muted-foreground hover:text-foreground -ml-2"
                    onClick={() => navigate({ to: '/admin/roles' })}
                >
                    <ArrowLeft className="size-4" />
                    Back to Roles
                </Button>

                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <Shield className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {isEditDisabled ? 'View Role' : 'Edit Role'}: {slug}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {isEditDisabled
                                ? 'Detailed operational security scope mapping for this role.'
                                : 'Define the name, functional description, and configure modular nested permission scopes.'}
                        </p>
                    </div>
                </div>
            </div>

            {roleDetails && <RoleAuditCard role={roleDetails} />}

            <div className="rounded-lg border bg-card p-6 shadow-xs">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center py-24 gap-3">
                                <Spinner className="h-6 w-6 text-primary animate-spin" />
                                <span className="text-xs text-muted-foreground font-medium">Loading role details...</span>
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
                                                        disabled={isEditDisabled}
                                                        placeholder={
                                                            isEditDisabled ? 'No description provided.' : 'Detailed role responsibilities...'
                                                        }
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
                                            {isEditDisabled
                                                ? 'View active permissions and access scope limits.'
                                                : 'Toggle permissions and adjust access scope limits.'}
                                        </span>
                                    </div>
                                    <RolePermissionTree
                                        treeData={treeData}
                                        currentPermissions={currentPermissions}
                                        readOnly={isEditDisabled}
                                        onPermissionChange={
                                            isEditDisabled
                                                ? undefined
                                                : (newPermissions) => form.setValue('permissions', newPermissions, { shouldDirty: true })
                                        }
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-2 border-t pt-4">
                                    <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/roles' })} className="h-9">
                                        {isEditDisabled ? 'Back' : 'Cancel'}
                                    </Button>
                                    {!isEditDisabled && (
                                        <Button type="submit" disabled={updateMutation.isPending || isLoading} className="h-9">
                                            {updateMutation.isPending ? (
                                                <div className="flex items-center gap-1">
                                                    <Spinner className="h-4 w-4" /> Saving...
                                                </div>
                                            ) : (
                                                'Save Changes'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </>
                        )}
                    </form>
                </Form>
            </div>
        </div>
    );
}
