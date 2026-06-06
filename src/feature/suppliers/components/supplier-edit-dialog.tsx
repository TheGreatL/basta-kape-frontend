import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Truck } from 'lucide-react';

import { updateSupplier } from '#/api/suppliers.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import { updateSupplierSchema } from '../suppliers.schema.ts';
import type { ISupplierListItem, IUpdateSupplierPayload } from '../suppliers.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

interface SupplierEditDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplier: ISupplierListItem | null;
}

interface EditSupplierFormValues {
    name: string;
    address?: string;
    contactPerson?: string;
    contactNumber?: string;
    notes?: string;
}

export default function SupplierEditDialog({ open, onOpenChange, supplier }: SupplierEditDialogProps) {
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

    const form = useForm<EditSupplierFormValues>({
        resolver: zodResolver(updateSupplierSchema),
        defaultValues: {
            name: '',
            address: '',
            contactPerson: '',
            contactNumber: '',
            notes: ''
        }
    });

    React.useEffect(() => {
        if (open && supplier) {
            form.reset({
                name: supplier.name,
                address: supplier.address || '',
                contactPerson: supplier.contactPerson || '',
                contactNumber: supplier.contactNumber || '',
                notes: supplier.notes || ''
            });
        }
    }, [open, supplier, form]);

    const editMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: IUpdateSupplierPayload }) => updateSupplier(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIERS_LIST] });
            if (supplier) {
                queryClient.invalidateQueries({ queryKey: [QUERY_KEY.SUPPLIERS.SUPPLIER_DETAILS, supplier.id] });
            }
            toast.success('Supplier Profile Updated', {
                description: 'The changes to the supplier profile have been successfully saved.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update supplier', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: EditSupplierFormValues) => {
        if (!supplier) return;
        editMutation.mutate({
            id: supplier.id,
            payload: {
                name: values.name,
                address: values.address || null,
                contactPerson: values.contactPerson || null,
                contactNumber: values.contactNumber || null,
                notes: values.notes || null
            }
        });
    };

    const isLoading = !isRendering || !supplier;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Truck className="size-5 text-primary" />
                        Modify Supplier Details
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Update supplier information, address lines, active contact numbers, and specific terms of trade.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Fetching details...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="name"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Supplier Name</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. Kape Beans Trading Co." {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField
                                            control={form.control}
                                            name="contactPerson"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Contact Person</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. Juan Dela Cruz" {...field} className="h-9 bg-background/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="contactNumber"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="font-semibold text-foreground/80">Contact Number</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="e.g. +639171234567" {...field} className="h-9 bg-background/50" />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="address"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Address</FormLabel>
                                                <FormControl>
                                                    <Input placeholder="e.g. 123 Coffee Lane, Manila" {...field} className="h-9 bg-background/50" />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="notes"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Notes / Remarks</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Primary supplier for Arabica and Robusta beans..."
                                                        className="min-h-[100px] bg-background/50 resize-y"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </>
                            )}
                        </div>

                        <DialogFooter className="px-6 py-4 border-t bg-muted/30 mt-4">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-9">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={editMutation.isPending || isLoading} className="h-9">
                                {editMutation.isPending ? (
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
