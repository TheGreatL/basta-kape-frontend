import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserPlus, Shield, ArrowLeft } from 'lucide-react';

import { getRolesList } from '#/api/rbac.api.ts';
import { createUser } from '#/api/users.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { createUserSchema } from './users.schema.ts';
import type { TCreateUserSchema } from './users.schema.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IRoleListItem } from '../rbac/rbac.types.ts';

type CreateUserFormValues = TCreateUserSchema;

export default function UserCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch roles list for assignment checkboxes
    const { data: rolesData, isLoading: isRolesLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.ROLES_LIST, { limit: 50, page: 1, status: 'active' }],
        queryFn: () => getRolesList({ limit: 50, page: 1, status: 'active' })
    });

    const form = useForm({
        resolver: zodResolver(createUserSchema),
        defaultValues: {
            email: '',
            username: '',
            password: '',
            firstName: '',
            lastName: '',
            middleName: '',
            phoneNumber: '',
            roleIds: []
        }
    });

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USERS_LIST] });
            toast.success('User Profile Created', {
                description: 'The new staff/user profile has been successfully configured and saved.'
            });
            navigate({ to: '/admin/users' });
        },
        onError: (error) => {
            toast.error('Failed to create user', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: CreateUserFormValues) => {
        createMutation.mutate({
            email: values.email,
            username: values.username,
            password: values.password,
            firstName: values.firstName,
            lastName: values.lastName,
            middleName: values.middleName || null,
            phoneNumber: values.phoneNumber || null,
            roleIds: values.roleIds
        });
    };

    const assignedRoles = form.watch('roleIds') ?? [];

    const handleRoleToggle = (checked: boolean, roleId: string) => {
        if (checked) {
            form.setValue('roleIds', [...assignedRoles, roleId], { shouldDirty: true });
        } else {
            form.setValue(
                'roleIds',
                assignedRoles.filter((id) => id !== roleId),
                { shouldDirty: true }
            );
        }
    };

    return (
        <div className="flex flex-col gap-6 ">
            {/* Header / Back Link */}
            <div className="flex flex-col gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/admin/users' })}
                    className="gap-1.5 self-start text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to Staff Directory
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Configure New User</h1>
                        <p className="text-xs text-muted-foreground">Define account credentials, contact information, and security roles.</p>
                    </div>
                </div>
            </div>

            {/* Form Content Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-xs">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-foreground/80 border-b pb-2">Profile Information</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="firstName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">First Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="John" {...field} className="h-9 bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="lastName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">Last Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Doe" {...field} className="h-9 bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="middleName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">Middle Name (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Smith" {...field} value={field.value || ''} className="h-9 bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="phoneNumber"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">Phone Number (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="+639171234567"
                                                    {...field}
                                                    value={field.value || ''}
                                                    className="h-9 bg-background/50"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-sm font-bold text-foreground/80 border-b pb-2">Account Credentials</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">Email Address</FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="john.doe@bastakape.com"
                                                    type="email"
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
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80">Username</FormLabel>
                                            <FormControl>
                                                <Input placeholder="johndoe" {...field} className="h-9 bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem className="sm:col-span-2">
                                            <FormLabel className="font-semibold text-foreground/80">Password</FormLabel>
                                            <FormControl>
                                                <Input type="password" placeholder="••••••••" {...field} className="h-9 bg-background/50" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Roles Selector */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between border-b pb-2">
                                <h2 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                                    <Shield className="size-4 text-primary" />
                                    Security Role Assignment
                                </h2>
                                <span className="text-xs text-muted-foreground font-medium">Assign one or more roles.</span>
                            </div>
                            {isRolesLoading ? (
                                <div className="flex items-center gap-2 py-4">
                                    <Spinner className="h-4 w-4 animate-spin text-primary" />
                                    <span className="text-xs text-muted-foreground">Loading active roles...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {rolesData?.data.map((role: IRoleListItem) => (
                                        <div
                                            key={role.id}
                                            className="flex items-center gap-2.5 p-3 rounded-lg border bg-background/30 hover:bg-background/55 transition-colors border-border/40"
                                        >
                                            <Checkbox
                                                id={`role-${role.id}`}
                                                checked={assignedRoles.includes(role.id)}
                                                onCheckedChange={(val) => handleRoleToggle(!!val, role.id)}
                                            />
                                            <label
                                                htmlFor={`role-${role.id}`}
                                                className="text-xs font-semibold capitalize cursor-pointer select-none text-foreground/90 flex-1"
                                            >
                                                {role.name}
                                                {role.isSystem && (
                                                    <span className="ml-1.5 inline-flex items-center px-1.5 py-0.2 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20 scale-95">
                                                        System
                                                    </span>
                                                )}
                                            </label>
                                        </div>
                                    ))}
                                    {rolesData?.data.length === 0 && (
                                        <div className="text-center text-xs text-muted-foreground py-2 col-span-2">
                                            No active security roles found in database.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer Controls */}
                        <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                            <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/users' })} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || isRolesLoading} className="h-9">
                                {createMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Create Profile'
                                )}
                            </Button>
                        </div>
                    </form>
                </Form>
            </div>
        </div>
    );
}
