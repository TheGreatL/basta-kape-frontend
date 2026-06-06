import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';

import { createAdjustment, getIngredients } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IIngredient, TAdjustmentType } from '../inventory.types';
import { InfiniteSelect } from '#/components/ui/infinite-select.tsx';

import { Button } from '#/components/ui/button.tsx';
import { Input } from '#/components/ui/input.tsx';
import { Textarea } from '#/components/ui/textarea.tsx';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select.tsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '#/components/ui/dialog.tsx';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '#/components/ui/form.tsx';
import { Spinner } from '#/components/ui/spinner.tsx';

const ADJUSTMENT_TYPE_OPTIONS: { value: TAdjustmentType; label: string }[] = [
    { value: 'WASTE', label: 'Waste' },
    { value: 'SPOILED', label: 'Spoiled' },
    { value: 'EXPIRED', label: 'Expired' },
    { value: 'THEFT', label: 'Theft' },
    { value: 'PROMOTIONAL_USE', label: 'Promotional Use' },
    { value: 'PHYSICAL_COUNT_DISCREPANCY', label: 'Physical Count Discrepancy' }
];

const adjustmentFormSchema = z.object({
    ingredientId: z.string().uuid('Please select a valid raw ingredient'),
    quantity: z.number().refine((val) => val !== 0, 'Quantity cannot be zero'),
    type: z.enum(['WASTE', 'SPOILED', 'EXPIRED', 'THEFT', 'PROMOTIONAL_USE', 'PHYSICAL_COUNT_DISCREPANCY'], {
        message: 'Please select an adjustment type'
    }),
    reason: z.string().max(500, 'Reason must not exceed 500 characters').optional()
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

interface AdjustmentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preselectedIngredient?: IIngredient | null;
}

export default function AdjustmentDialog({ open, onOpenChange, preselectedIngredient }: AdjustmentDialogProps) {
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

    const form = useForm<AdjustmentFormValues>({
        resolver: zodResolver(adjustmentFormSchema),
        defaultValues: {
            ingredientId: '',
            quantity: 0,
            type: 'WASTE',
            reason: ''
        }
    });

    React.useEffect(() => {
        if (open) {
            form.reset({
                ingredientId: preselectedIngredient?.id || '',
                quantity: 0,
                type: 'WASTE',
                reason: ''
            });
        }
    }, [open, preselectedIngredient, form]);

    const adjustmentMutation = useMutation({
        mutationFn: createAdjustment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.ADJUSTMENTS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Stock Adjustment Recorded', {
                description: 'The waste log has been saved and live stock levels updated.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to log adjustment', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: AdjustmentFormValues) => {
        adjustmentMutation.mutate({
            ingredientId: values.ingredientId,
            quantity: values.quantity,
            type: values.type,
            reason: values.reason || undefined
        });
    };

    const isLoading = !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        <Trash2 className="size-5 text-primary" />
                        Log Waste / Stock Adjustment
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        Record waste, spoilage, theft, or manual correction events that reduce or adjust stock levels.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col min-h-0">
                        <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 min-h-0">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center py-20 gap-3">
                                    <Spinner className="h-6 w-6 text-primary animate-spin" />
                                    <span className="text-xs text-muted-foreground font-medium">Loading form...</span>
                                </div>
                            ) : (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="ingredientId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Select Raw Ingredient</FormLabel>
                                                <FormControl>
                                                    <InfiniteSelect<IIngredient>
                                                        queryKey={[QUERY_KEY.INVENTORY.INGREDIENTS_LIST]}
                                                        fetchFn={async ({ pageParam, query }) => {
                                                            return getIngredients({
                                                                page: pageParam || 1,
                                                                limit: 20,
                                                                search: query,
                                                                status: 'active'
                                                            });
                                                        }}
                                                        getItems={(page) => page.data}
                                                        getNextPageParam={(lastPage) => {
                                                            return lastPage.meta.hasMore ? lastPage.meta.currentPage + 1 : undefined;
                                                        }}
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        getOptionValue={(item) => item.id}
                                                        getOptionLabel={(item) => item.name}
                                                        selectedItem={preselectedIngredient || undefined}
                                                        placeholder="Choose ingredient..."
                                                        searchPlaceholder="Search ingredients..."
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="type"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Adjustment Type</FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 bg-background/50">
                                                            <SelectValue placeholder="Select type..." />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {ADJUSTMENT_TYPE_OPTIONS.map((opt) => (
                                                            <SelectItem key={opt.value} value={opt.value}>
                                                                {opt.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="quantity"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Quantity Change</FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="any"
                                                        placeholder="e.g. -500"
                                                        {...field}
                                                        className="h-9 bg-background/50"
                                                    />
                                                </FormControl>
                                                <p className="text-xs text-muted-foreground">Use negative values for reductions (e.g. -500).</p>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="reason"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-foreground/80">Reason / Notes</FormLabel>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Spilled during transfer, expired batch BN-042..."
                                                        className="min-h-[80px] bg-background/50 resize-y"
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
                            <Button type="submit" disabled={adjustmentMutation.isPending || isLoading} className="h-9">
                                {adjustmentMutation.isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> Logging...
                                    </div>
                                ) : (
                                    'Log Adjustment'
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
