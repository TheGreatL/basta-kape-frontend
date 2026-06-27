import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { User, Shield, Calendar, Mail, Phone, Hash, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

import { getRolesList } from '#/api/rbac.api.ts';
import { getUserById, updateUser } from '#/api/users.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { updateUserSchema } from './users.schema.ts';
import type { TUpdateUserSchema } from './users.schema.ts';
import type { IUpdateUserPayload } from './users.types.ts';
import UserAvatarUpload from './components/user-avatar-upload.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IRoleListItem } from '../rbac/rbac.types.ts';

type EditUserFormValues = TUpdateUserSchema;

export default function UserDetailPage() {
    const { slug } = useParams({ strict: false });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();

    const permissions = getUserPermissions(authUser);
    const hasUpdatePermission = hasPermission(permissions, 'Users Management', 'update');

    // Fetch user details
    const { data: userDetails, isLoading: isUserDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.USERS.USER_DETAILS, slug],
        queryFn: () => getUserById(slug as string),
        enabled: !!slug
    });

    // Fetch active roles list
    const { data: rolesData, isLoading: isRolesLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.ROLES_LIST, { limit: 50, page: 1, status: 'active' }],
        queryFn: () => getRolesList({ limit: 50, page: 1, status: 'active' })
    });

    const form = useForm({
        resolver: zodResolver(updateUserSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            middleName: '',
            phoneNumber: '',
            roleIds: [] as string[]
        }
    });

    React.useEffect(() => {
        if (userDetails) {
            form.reset({
                firstName: userDetails.firstName,
                lastName: userDetails.lastName,
                middleName: userDetails.middleName || '',
                phoneNumber: userDetails.phoneNumber || '',
                roleIds: userDetails.userRoles.map((ur: any) => ur.role.id)
            });
        }
    }, [userDetails, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateUserPayload }) => updateUser(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USER_DETAILS, slug] });
            toast.success('User Profile Updated', {
                description: 'The staff profile modifications have been successfully saved.'
            });
            navigate({ to: '/admin/users' });
        },
        onError: (error) => {
            toast.error('Failed to update user', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: EditUserFormValues) => {
        if (!userDetails) return;
        updateMutation.mutate({
            id: userDetails.id,
            payload: {
                firstName: values.firstName,
                lastName: values.lastName,
                middleName: values.middleName || null,
                phoneNumber: values.phoneNumber || null,
                roleIds: values.roleIds
            }
        });
    };

    const assignedRoles = form.watch('roleIds') ?? [];
    const isLoading = isUserDetailsLoading || isRolesLoading;

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

    const handleAvatarSuccess = () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USERS_LIST] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USER_DETAILS, slug] });
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
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">{hasUpdatePermission ? 'Edit User Profile' : 'View User Profile'}</h1>
                        <p className="text-xs text-muted-foreground">
                            {hasUpdatePermission
                                ? 'Modify user profile specifications, credentials, profile photo, and security roles.'
                                : 'Overview of staff credentials, profile data, history records, and security roles.'}
                        </p>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3 border rounded-xl bg-card">
                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                    <span className="text-xs text-muted-foreground font-medium">Loading user details...</span>
                </div>
            ) : (
                userDetails && (
                    <div className="space-y-6">
                        {/* Avatar Card */}
                        <div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col items-center gap-4">
                            <h2 className="text-sm font-bold text-foreground/80 self-start border-b w-full pb-2">Profile Photo</h2>
                            <div className="py-2 w-full flex justify-center">
                                <UserAvatarUpload
                                    userId={userDetails.id}
                                    currentPhotoUrl={userDetails.profilePhoto}
                                    firstName={userDetails.firstName}
                                    lastName={userDetails.lastName}
                                    onUploadSuccess={handleAvatarSuccess}
                                    readOnly={!hasUpdatePermission}
                                />
                            </div>
                        </div>

                        {/* Form Card */}
                        <div className="rounded-xl border bg-card text-card-foreground shadow-xs">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-6">
                                    <div className="space-y-4">
                                        <h2 className="text-sm font-bold text-foreground/80 border-b pb-2">Profile Details</h2>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <FormField
                                                control={form.control}
                                                name="firstName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">First Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="John"
                                                                disabled={!hasUpdatePermission}
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
                                                name="lastName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">Last Name</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Doe"
                                                                disabled={!hasUpdatePermission}
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
                                                name="middleName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="font-semibold text-foreground/80">Middle Name (Optional)</FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="Smith"
                                                                disabled={!hasUpdatePermission}
                                                                {...field}
                                                                value={field.value || ''}
                                                                className="h-9 bg-background/50"
                                                            />
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
                                                        <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                                            <Phone className="size-3.5 text-muted-foreground" />
                                                            Phone Number (Optional)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                placeholder="+639171234567"
                                                                disabled={!hasUpdatePermission}
                                                                {...field}
                                                                value={field.value || ''}
                                                                className="h-9 bg-background/50"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <div className="space-y-2">
                                                <span className="font-semibold text-xs text-foreground/80 flex items-center gap-1.5">
                                                    <Mail className="size-3.5 text-muted-foreground" />
                                                    Email Address
                                                </span>
                                                <Input disabled value={userDetails.email} className="h-9 bg-muted/40 cursor-not-allowed" />
                                            </div>
                                            <div className="space-y-2">
                                                <span className="font-semibold text-xs text-foreground/80 flex items-center gap-1.5">
                                                    <Hash className="size-3.5 text-muted-foreground" />
                                                    Username
                                                </span>
                                                <Input disabled value={userDetails.username} className="h-9 bg-muted/40 cursor-not-allowed" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Security Roles Assignment */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <h2 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                                                <Shield className="size-4 text-primary" />
                                                Security Role Assignment
                                            </h2>
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {hasUpdatePermission ? 'Select active authorization scope.' : 'Currently assigned security roles.'}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {rolesData?.data
                                                .filter((role: IRoleListItem) => role.name.toLowerCase() !== 'customer')
                                                .map((role: IRoleListItem) => (
                                                    <div
                                                        key={role.id}
                                                        className="flex items-center gap-2.5 p-3 rounded-lg border bg-background/30 border-border/40"
                                                    >
                                                        <Checkbox
                                                            id={`role-${role.id}`}
                                                            checked={assignedRoles.includes(role.id)}
                                                            disabled={!hasUpdatePermission}
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
                                    </div>

                                    {/* Audit Information */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <h2 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                                                <Calendar className="size-4 text-primary" />
                                                Audit Timestamps
                                            </h2>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-muted-foreground bg-muted/20 p-4 rounded-lg border">
                                            <div>
                                                <span className="font-semibold text-foreground/70 block">Created Date</span>
                                                {format(new Date(userDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                            </div>
                                            <div>
                                                <span className="font-semibold text-foreground/70 block">Last Updated</span>
                                                {format(new Date(userDetails.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                            </div>
                                            {userDetails.deletedAt && (
                                                <div className="sm:col-span-2 text-destructive font-semibold border-t pt-2 mt-2">
                                                    <span>Archived / Soft Deleted At</span>:{' '}
                                                    {format(new Date(userDetails.deletedAt), 'MMMM dd, yyyy - hh:mm a')}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Form Footer */}
                                    <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                                        <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/users' })} className="h-9">
                                            {hasUpdatePermission ? 'Cancel' : 'Back'}
                                        </Button>
                                        {hasUpdatePermission && (
                                            <Button type="submit" disabled={updateMutation.isPending} className="h-9">
                                                {updateMutation.isPending ? (
                                                    <div className="flex items-center gap-1">
                                                        <Spinner className="h-4 w-4" /> Saving...
                                                    </div>
                                                ) : (
                                                    'Save Updates'
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </form>
                            </Form>
                        </div>
                    </div>
                )
            )}
        </div>
    );
}
