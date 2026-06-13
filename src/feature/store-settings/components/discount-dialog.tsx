import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { createDiscountConfig, updateDiscountConfig } from '#/api/discounts.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IDiscount } from '../discounts.types';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Switch } from '#/components/ui/switch.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

const discountSchema = z.object({
    name: z.string().min(1, 'Discount name is required').max(100, 'Max 100 characters'),
    type: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z.number().min(0, 'Discount value must be non-negative'),
    code: z.string().max(50, 'Max 50 characters').nullable().optional(),
    isActive: z.boolean()
});

type DiscountFormValues = z.infer<typeof discountSchema>;

interface DiscountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    discount?: IDiscount | null;
}

export default function DiscountDialog({ open, onOpenChange, discount }: DiscountDialogProps) {
    const queryClient = useQueryClient();
    const isEdit = !!discount;

    const form = useForm<DiscountFormValues>({
        resolver: zodResolver(discountSchema),
        defaultValues: {
            name: '',
            type: 'PERCENTAGE',
            value: 0,
            code: '',
            isActive: true
        }
    });

    React.useEffect(() => {
        if (open) {
            if (discount) {
                form.reset({
                    name: discount.name,
                    type: discount.type,
                    value: discount.value,
                    code: discount.code || '',
                    isActive: discount.isActive
                });
            } else {
                form.reset({
                    name: '',
                    type: 'PERCENTAGE',
                    value: 0,
                    code: '',
                    isActive: true
                });
            }
        }
    }, [open, discount, form]);

    const mutation = useMutation({
        mutationFn: (values: DiscountFormValues) => {
            const payload = {
                ...values,
                code: values.code || null
            };
            if (isEdit) {
                return updateDiscountConfig(discount.id, payload);
            }
            return createDiscountConfig(payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.STORE_SETTINGS.DISCOUNTS_LIST] });
            toast.success(isEdit ? 'Discount configuration updated' : 'Discount configuration created');
            onOpenChange(false);
        },
        onError: (err) => {
            toast.error(isEdit ? 'Failed to update discount' : 'Failed to create discount', {
                description: getErrorMessage(err)
            });
        }
    });

    const onSubmit = (values: DiscountFormValues) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md bg-background border-border/60 rounded-2xl p-0 overflow-hidden shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-2 border-b border-border/40">
                    <DialogTitle className="text-lg font-bold">
                        {isEdit ? 'Edit Discount Configuration' : 'Create Discount Configuration'}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground">
                        {isEdit ? 'Update details for this discount setting.' : 'Set up a new discount promotion or compliance option.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="px-6 py-4">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">Discount Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Senior Citizen or Soft Launch 10% Off"
                                                className="h-9 bg-background/50 text-xs"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80 text-xs">Type</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 bg-background/50 text-xs">
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="PERCENTAGE" className="text-xs">
                                                        Percentage (%)
                                                    </SelectItem>
                                                    <SelectItem value="FIXED_AMOUNT" className="text-xs">
                                                        Fixed Amount (₱)
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="value"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-foreground/80 text-xs">Value</FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    placeholder="0.00"
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                    className="h-9 bg-background/50 text-xs font-semibold"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-foreground/80 text-xs">Promo Code (Optional)</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. SC20 or SOFT10"
                                                className="h-9 bg-background/50 text-xs font-mono"
                                                {...field}
                                                value={field.value || ''}
                                            />
                                        </FormControl>
                                        <FormDescription className="text-xs text-muted-foreground">
                                            Optional custom code. Case-insensitive SC or PWD triggers VAT-exemption behavior.
                                        </FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="isActive"
                                render={({ field }) => (
                                    <FormItem className="flex flex-row items-center justify-between rounded-xl border border-border/50 bg-muted/10 p-3.5 shadow-3xs">
                                        <div className="space-y-0.5">
                                            <FormLabel className="text-xs font-bold text-foreground/80">Active Configuration</FormLabel>
                                            <FormDescription className="text-xs text-muted-foreground leading-none">
                                                Inactive discounts cannot be applied at POS.
                                            </FormDescription>
                                        </div>
                                        <FormControl>
                                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />

                            <Button type="submit" className="w-full h-9 gap-1.5 text-xs font-bold mt-2 shadow-xs" disabled={mutation.isPending}>
                                {mutation.isPending ? (
                                    <>
                                        <Spinner className="size-3.5 animate-spin" />
                                        Saving configuration...
                                    </>
                                ) : isEdit ? (
                                    'Update Configuration'
                                ) : (
                                    'Create Configuration'
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>

                <DialogFooter className="px-6 py-3 border-t bg-muted/30 shrink-0">
                    <Button variant="ghost" type="button" onClick={() => onOpenChange(false)} className="h-8.5 text-xs">
                        Cancel
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
