import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { User, Calendar, ShieldAlert, ArrowLeft, Phone, Mail, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

import { getCustomerById, updateCustomer } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { updateCustomerSchema } from './customer.schema.ts';
import type { IUpdateCustomer } from '#/feature/customer/customer.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Badge } from '#/components/ui/badge.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Input } from '#/components/ui/input.tsx';

export default function CustomerDetailPage() {
    const { slug } = useParams({ strict: false });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();

    const permissions = getUserPermissions(authUser);
    const hasUpdatePermission = hasPermission(permissions, 'Customers Management', 'update');

    // Fetch customer details (matches UUID or username)
    const { data: customerDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMER_DETAILS, slug],
        queryFn: () => getCustomerById(slug!),
        enabled: !!slug
    });

    const form = useForm({
        resolver: zodResolver(updateCustomerSchema),
        defaultValues: {
            email: '',
            username: '',
            firstName: '',
            lastName: '',
            middleName: '',
            phoneNumber: ''
        }
    });

    React.useEffect(() => {
        if (customerDetails) {
            form.reset({
                email: customerDetails.user.email,
                username: customerDetails.user.username,
                firstName: customerDetails.user.firstName,
                lastName: customerDetails.user.lastName,
                middleName: customerDetails.user.middleName || '',
                phoneNumber: customerDetails.user.phoneNumber || ''
            });
        }
    }, [customerDetails, form]);

    // Mutation: Update Profile
    const updateProfileMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateCustomer }) => updateCustomer(id, payload),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMER_DETAILS, slug] });
            toast.success('Customer Profile Updated', {
                description: 'Customer settings have been successfully modified.'
            });
            // If username changed, redirect to new slug to keep URL in sync
            if (data.user.username !== slug) {
                navigate({ to: '/admin/customers/$slug', params: { slug: data.user.username } });
            }
        },
        onError: (error) => {
            toast.error('Failed to update customer', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: any) => {
        if (!customerDetails) return;
        updateProfileMutation.mutate({
            id: customerDetails.id,
            payload: {
                email: values.email || undefined,
                username: values.username || undefined,
                firstName: values.firstName,
                lastName: values.lastName,
                middleName: values.middleName || null,
                phoneNumber: values.phoneNumber || null
            }
        });
    };

    if (isDetailsLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3 border rounded-xl bg-card">
                <Spinner className="h-6 w-6 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground font-medium">Loading customer profile...</span>
            </div>
        );
    }

    if (!customerDetails) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-3 border rounded-xl bg-card text-center px-6">
                <ShieldAlert className="h-10 w-10 text-destructive" />
                <h2 className="text-lg font-bold text-foreground">Customer Not Found</h2>
                <p className="text-xs text-muted-foreground max-w-sm">
                    The requested customer profile could not be loaded. They may have been fully deleted or the ID/username is incorrect.
                </p>
                <Button onClick={() => navigate({ to: '/admin/customers' })} variant="outline" className="mt-2 h-9">
                    Back to Customers List
                </Button>
            </div>
        );
    }

    const initials = `${customerDetails.user.firstName[0] || ''}${customerDetails.user.lastName[0] || ''}`.toUpperCase();

    return (
        <div className="flex flex-col gap-6">
            {/* Header / Back Link */}
            <div className="flex flex-col gap-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate({ to: '/admin/customers' })}
                    className="gap-1.5 self-start text-muted-foreground hover:text-foreground"
                >
                    <ArrowLeft className="size-4" />
                    Back to Customers Directory
                </Button>
                <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">
                            {hasUpdatePermission ? 'Edit Customer Profile' : 'View Customer Profile'}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            {hasUpdatePermission
                                ? 'Modify customer profile specifications, email, and contact details.'
                                : 'Overview of customer credentials and contact details.'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Profile Overview Card */}
            <div className="flex flex-col md:flex-row gap-5 items-start bg-muted/20 p-4 rounded-xl border border-border/40 shadow-3xs">
                <div className="size-16 rounded-full overflow-hidden border border-border/60 shrink-0 bg-background/50 flex items-center justify-center shadow-3xs">
                    <span className="font-bold text-xl text-primary/80 uppercase">{initials || 'CU'}</span>
                </div>
                <div className="space-y-1 flex-1 min-w-0 w-full">
                    <div className="flex flex-wrap gap-2 items-center">
                        <h3 className="text-base font-bold text-foreground/90 truncate leading-tight">
                            {customerDetails.user.firstName} {customerDetails.user.lastName}
                        </h3>
                        <Badge variant="outline" className="text-xs py-0 px-2 font-semibold bg-background uppercase">
                            {customerDetails.deletedAt !== null ? 'Archived' : 'Active'}
                        </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="flex items-center gap-1">
                            <User className="size-3 text-muted-foreground" /> @{customerDetails.user.username}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                            <Mail className="size-3 text-muted-foreground" /> {customerDetails.user.email}
                        </span>
                        {customerDetails.user.phoneNumber && (
                            <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Phone className="size-3 text-muted-foreground" /> {customerDetails.user.phoneNumber}
                                </span>
                            </>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground pt-1 flex items-center gap-1.5 font-normal">
                        <Calendar className="size-3.5 text-muted-foreground" />
                        Joined: {format(new Date(customerDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                    </p>
                </div>
            </div>

            {/* Account Details Form Card */}
            <div className="rounded-xl border bg-card text-card-foreground shadow-xs p-6">
                <div className="flex items-center gap-2 border-b pb-3 mb-4">
                    <Edit2 className="size-4.5 text-primary" />
                    <h2 className="text-sm font-bold text-foreground/80">Account Details</h2>
                </div>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="firstName"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-foreground/80 text-xs">First Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John" disabled={!hasUpdatePermission} {...field} className="h-9 bg-background/50" />
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
                                    <FormLabel className="font-semibold text-foreground/80 text-xs">Last Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Doe" disabled={!hasUpdatePermission} {...field} className="h-9 bg-background/50" />
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
                                    <FormLabel className="font-semibold text-foreground/80 text-xs">Middle Name (Optional)</FormLabel>
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
                                    <FormLabel className="font-semibold text-foreground/80 text-xs">Phone Number (Optional)</FormLabel>
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
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-foreground/80 text-xs">Email Address</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="john.doe@gmail.com"
                                            type="email"
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
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="font-semibold text-foreground/80 text-xs">Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="johndoe" disabled={!hasUpdatePermission} {...field} className="h-9 bg-background/50" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {hasUpdatePermission && (
                            <div className="flex items-center justify-end gap-2 border-t pt-4 mt-4">
                                <Button
                                    type="submit"
                                    disabled={updateProfileMutation.isPending}
                                    className="h-9 w-full shadow-xs bg-primary hover:bg-primary/95 text-primary-foreground"
                                >
                                    {updateProfileMutation.isPending ? (
                                        <div className="flex items-center justify-center gap-1">
                                            <Spinner className="h-4 w-4 animate-spin" /> Saving...
                                        </div>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </Button>
                            </div>
                        )}
                    </form>
                </Form>
            </div>
        </div>
    );
}
