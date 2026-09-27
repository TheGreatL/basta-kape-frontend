import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { User, Calendar, ShieldAlert, ArrowLeft, Phone, Mail, Hash, KeyRound } from 'lucide-react';
import { format } from 'date-fns';

import { getCustomerById, updateCustomer, adminResetCustomerPassword } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { useAuth } from '#/context/AuthContext.tsx';
import { getUserPermissions, hasPermission } from '#/utils/rbac.ts';
import { updateCustomerSchema } from './customer.schema.ts';
import type { TUpdateCustomerSchema } from './customer.schema.ts';

import type { IUpdateCustomer } from '#/feature/customer/customer.types.ts';
import UserAvatarUpload from '#/feature/users/components/user-avatar-upload.tsx';
import { AdminResetPasswordDialog } from '#/components/admin/admin-reset-password-dialog.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Input } from '#/components/ui/input.tsx';

type EditCustomerFormValues = TUpdateCustomerSchema;

export default function CustomerDetailPage() {
    const { slug } = useParams({ strict: false });
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user: authUser } = useAuth();

    const [isResetPasswordOpen, setIsResetPasswordOpen] = React.useState(false);

    const permissions = getUserPermissions(authUser);
    const hasUpdatePermission = hasPermission(permissions, 'Customers Management', 'update');

    // Fetch customer details (matches UUID or username)
    const { data: customerDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMER_DETAILS, slug],
        queryFn: () => getCustomerById(slug!),
        enabled: !!slug
    });

    const form = useForm<EditCustomerFormValues>({
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

    const onSubmit = (values: EditCustomerFormValues) => {
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

    const handleAvatarSuccess = () => {
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST] });
        queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMER_DETAILS, slug] });
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
                    Back to Customers Directory
                </Button>
            </div>
        );
    }

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
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                            <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-foreground">
                                {hasUpdatePermission ? 'Edit Customer Profile' : 'View Customer Profile'}
                            </h1>
                            <p className="text-xs text-muted-foreground">
                                {hasUpdatePermission
                                    ? 'Modify customer profile specifications, credentials, profile photo, and contact details.'
                                    : 'Overview of customer credentials, profile data, history records, and contact details.'}
                            </p>
                        </div>
                    </div>
                    {hasUpdatePermission && (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsResetPasswordOpen(true)}
                            className="gap-1.5 self-start sm:self-auto h-9"
                        >
                            <KeyRound className="size-4 text-primary" />
                            Reset Password
                        </Button>
                    )}
                </div>
            </div>

            <div className="space-y-6">
                {/* Avatar Card */}
                <div className="rounded-xl border bg-card p-6 shadow-xs flex flex-col items-center gap-4">
                    <h2 className="text-sm font-bold text-foreground/80 self-start border-b w-full pb-2">Profile Photo</h2>
                    <div className="py-2 w-full flex justify-center">
                        <UserAvatarUpload
                            userId={customerDetails.userId || customerDetails.user.id}
                            currentPhotoUrl={customerDetails.user.profilePhoto}
                            firstName={customerDetails.user.firstName}
                            lastName={customerDetails.user.lastName}
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
                                    <FormField
                                        control={form.control}
                                        name="email"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                                    <Mail className="size-3.5 text-muted-foreground" />
                                                    Email Address
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="john.doe@gmail.com"
                                                        type="email"
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
                                        name="username"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80 flex items-center gap-1.5">
                                                    <Hash className="size-3.5 text-muted-foreground" />
                                                    Username
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        placeholder="johndoe"
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
                                        {format(new Date(customerDetails.createdAt), 'MMMM dd, yyyy - hh:mm a')}
                                    </div>
                                    <div>
                                        <span className="font-semibold text-foreground/70 block">Last Updated</span>
                                        {format(new Date(customerDetails.updatedAt), 'MMMM dd, yyyy - hh:mm a')}
                                    </div>
                                    {customerDetails.deletedAt && (
                                        <div className="sm:col-span-2 text-destructive font-semibold border-t pt-2 mt-2">
                                            <span>Archived / Soft Deleted At</span>:{' '}
                                            {format(new Date(customerDetails.deletedAt), 'MMMM dd, yyyy - hh:mm a')}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Form Footer */}
                            <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                                <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/customers' })} className="h-9">
                                    {hasUpdatePermission ? 'Cancel' : 'Back'}
                                </Button>
                                {hasUpdatePermission && (
                                    <Button type="submit" disabled={updateProfileMutation.isPending} className="h-9">
                                        {updateProfileMutation.isPending ? (
                                            <div className="flex items-center gap-1">
                                                <Spinner className="h-4 w-4 animate-spin" /> Saving...
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

            <AdminResetPasswordDialog
                open={isResetPasswordOpen}
                onOpenChange={setIsResetPasswordOpen}
                target={{
                    id: customerDetails.id,
                    name: `${customerDetails.user.firstName} ${customerDetails.user.lastName}`,
                    username: customerDetails.user.username,
                    email: customerDetails.user.email,
                    type: 'customer'
                }}
                onResetPassword={adminResetCustomerPassword}
            />
        </div>
    );
}
