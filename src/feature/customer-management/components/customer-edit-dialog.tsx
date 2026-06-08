import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Edit2 } from 'lucide-react';

import { updateCustomer } from '#/api/customer.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { updateCustomerSchema } from '../customer.schema.ts';
import type { ICustomerResponse, IUpdateCustomer } from '#/feature/customer/customer.types.ts';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface EditCustomerFormValues {
    email?: string;
    username?: string;
    firstName: string;
    lastName: string;
    middleName?: string;
    phoneNumber?: string;
}

interface CustomerEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    customer: ICustomerResponse | null;
}

export default function CustomerEditDialog({ open, onOpenChange, customer }: CustomerEditDialogProps) {
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
        if (customer) {
            form.reset({
                email: customer.user.email,
                username: customer.user.username,
                firstName: customer.user.firstName,
                lastName: customer.user.lastName,
                middleName: customer.user.middleName || '',
                phoneNumber: customer.user.phoneNumber || ''
            });
        } else {
            form.reset({
                email: '',
                username: '',
                firstName: '',
                lastName: '',
                middleName: '',
                phoneNumber: ''
            });
        }
    }, [customer, open, form]);

    const updateMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateCustomer }) => updateCustomer(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMERS_LIST] });
            if (customer?.id) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.CUSTOMERS.CUSTOMER_DETAILS, customer.id] });
            }
            toast.success('Customer Profile Updated', {
                description: 'Customer settings have been successfully modified.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update customer', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: EditCustomerFormValues) => {
        if (!customer) return;
        updateMutation.mutate({
            id: customer.id,
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

    const isLoading = !isRendering || !customer;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Edit2 className="size-5 text-primary" />
                        Edit Customer: {customer?.user.firstName} {customer?.user.lastName}
                    </DialogTitle>
                    <DialogDescription className="text-xs">Modify profile settings, email configurations, and account details.</DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-24 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading details...</span>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="firstName"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">First Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="Charlie" {...field} className="h-9 bg-background/50" />
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
                                                    <Input placeholder="Customer" {...field} className="h-9 bg-background/50" />
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
                                                        placeholder="+639170000000"
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
                                                        placeholder="customer@bastakape.com"
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
                                                    <Input placeholder="customerUser" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </div>
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
                                    'Save Changes'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
