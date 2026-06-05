import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserPlus, Shield } from 'lucide-react';

import { getRolesList } from '#/api/rbac.api.ts';
import { createUser } from '#/api/users.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { createUserSchema } from '../users.schema.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Checkbox } from '#/components/ui/checkbox.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import type { IRoleListItem } from '../../rbac/rbac.types.ts';

interface UserCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface CreateUserFormValues {
    email: string;
    username: string;
    password: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phoneNumber?: string;
    roleIds?: string[];
}

export default function UserCreateDialog({ open, onOpenChange }: UserCreateDialogProps) {
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

    // Fetch roles list for assignment checkboxes
    const { data: rolesData, isLoading: isRolesLoading } = useQuery({
        queryKey: [QUERY_KEY.RBAC.ROLES_LIST, { limit: 50, page: 1, status: 'active' }],
        queryFn: () => getRolesList({ limit: 50, page: 1, status: 'active' }),
        enabled: open
    });

    const form = useForm<CreateUserFormValues>({
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

    React.useEffect(() => {
        if (!open) {
            form.reset({
                email: '',
                username: '',
                password: '',
                firstName: '',
                lastName: '',
                middleName: '',
                phoneNumber: '',
                roleIds: []
            });
        }
    }, [open, form]);

    const createMutation = useMutation({
        mutationFn: createUser,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.USERS.USERS_LIST] });
            toast.success('User Profile Created', {
                description: 'The new staff/user profile has been successfully configured and saved.'
            });
            onOpenChange(false);
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

    const assignedRoles = form.watch('roleIds') || [];
    const isLoading = isRolesLoading || !isRendering;

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
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <UserPlus className="size-5 text-primary" />
                        Configure New User Profile
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Define account details, credential configurations, and assign security roles.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading user configuration...</span>
                                </div>
                            ) : (
                                <>
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
                                                        <Input
                                                            placeholder="Smith"
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

                                    {/* Roles Selector */}
                                    <div className="space-y-3 pt-2">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <h3 className="text-sm font-bold text-foreground/80 flex items-center gap-1.5">
                                                <Shield className="size-4 text-primary" />
                                                Security Role Assignment
                                            </h3>
                                            <span className="text-xs text-muted-foreground font-medium">Assign one or more roles.</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {rolesData?.data.map((role: IRoleListItem) => (
                                                <div
                                                    key={role.id}
                                                    className="flex items-center gap-2.5 p-2 rounded-lg border bg-background/50 hover:bg-background/80 transition-colors border-border/40"
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
                                    </div>
                                </>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending || isLoading} className="h-9">
                                {createMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Saving...
                                    </div>
                                ) : (
                                    'Create Profile'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
