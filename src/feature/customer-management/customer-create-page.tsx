import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { UserPlus, ArrowLeft } from 'lucide-react';

import { createCustomer } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { createCustomerSchema } from './customer.schema.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

export default function CustomerCreatePage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const form = useForm({
        resolver: zodResolver(createCustomerSchema),
        defaultValues: {
            email: '',
            username: '',
            password: '',
            firstName: '',
            lastName: '',
            middleName: '',
            phoneNumber: ''
        }
    });

    const createMutation = useMutation({
        mutationFn: createCustomer,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST] });
            toast.success('Customer Profile Created', {
                description: 'The new customer profile has been successfully saved.'
            });
            navigate({ to: '/admin/customers' });
        },
        onError: (error) => {
            toast.error('Failed to create customer', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: any) => {
        createMutation.mutate({
            email: values.email,
            username: values.username,
            password: values.password || undefined,
            firstName: values.firstName,
            lastName: values.lastName,
            middleName: values.middleName || null,
            phoneNumber: values.phoneNumber || null
        });
    };

    return (
        <div className="flex flex-col gap-6 ">
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
                        <UserPlus className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Configure New Customer</h1>
                        <p className="text-xs text-muted-foreground">Define account credentials, contact information, and security settings.</p>
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
                                                <Input placeholder="john.doe@gmail.com" type="email" {...field} className="h-9 bg-background/50" />
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
                                            <FormLabel className="font-semibold text-foreground/80">Password (Optional)</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="password"
                                                    placeholder="Leave blank for standard placeholder (WelcomeCustomer123!)"
                                                    {...field}
                                                    className="h-9 bg-background/50"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="flex items-center justify-end gap-2 border-t pt-4 mt-6">
                            <Button type="button" variant="outline" onClick={() => navigate({ to: '/admin/customers' })} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={createMutation.isPending} className="h-9">
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
