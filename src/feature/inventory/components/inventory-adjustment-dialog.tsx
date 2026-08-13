import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Trash2, Edit } from 'lucide-react';

import { createAdjustment, updateAdjustment, getIngredients } from '#/api/inventory.api.ts';
import QUERY_KEY from '#/constants/query-keys.ts';
import { getErrorMessage } from '#/utils/error-handler.ts';
import type { IAdjustment, IIngredient, TAdjustmentType } from '../inventory.types';
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
    adjustmentToEdit?: IAdjustment | null;
}

export default function AdjustmentDialog({ open, onOpenChange, preselectedIngredient, adjustmentToEdit }: AdjustmentDialogProps) {
    const queryClient = useQueryClient();
    const [isRendering, setIsRendering] = React.useState(false);
    const isEditMode = Boolean(adjustmentToEdit);

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

    const selectedType = form.watch('type');
    const isDiscrepancy = selectedType === 'PHYSICAL_COUNT_DISCREPANCY';

    const [selectedIngredient, setSelectedIngredient] = React.useState<IIngredient | null>(
        adjustmentToEdit?.ingredient || preselectedIngredient || null
    );

    React.useEffect(() => {
        if (open) {
            const initialIngredient = adjustmentToEdit?.ingredient || preselectedIngredient || null;
            setSelectedIngredient(initialIngredient);

            if (adjustmentToEdit) {
                const initialQty =
                    adjustmentToEdit.type === 'PHYSICAL_COUNT_DISCREPANCY' ? adjustmentToEdit.quantity : Math.abs(adjustmentToEdit.quantity);

                form.reset({
                    ingredientId: adjustmentToEdit.ingredientId,
                    quantity: initialQty,
                    type: adjustmentToEdit.type,
                    reason: adjustmentToEdit.reason || ''
                });
            } else {
                form.reset({
                    ingredientId: preselectedIngredient?.id || '',
                    quantity: 0,
                    type: 'WASTE',
                    reason: ''
                });
            }
        }
    }, [open, preselectedIngredient, adjustmentToEdit, form]);

    const createMutation = useMutation({
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

    const editMutation = useMutation({
        mutationFn: ({ id, payload }: { id: string; payload: Parameters<typeof updateAdjustment>[1] }) => updateAdjustment(id, payload),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.ADJUSTMENTS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.LEVELS_LIST] });
            queryClient.invalidateQueries({ queryKey: [QUERY_KEY.INVENTORY.FORECAST] });
            toast.success('Stock Adjustment Updated', {
                description: 'The waste log entry has been updated and stock levels recalculated.'
            });
            onOpenChange(false);
        },
        onError: (error) => {
            toast.error('Failed to update adjustment', {
                description: getErrorMessage(error)
            });
        }
    });

    const onSubmit = (values: AdjustmentFormValues) => {
        const adjustedQuantity = values.type === 'PHYSICAL_COUNT_DISCREPANCY' ? values.quantity : -Math.abs(values.quantity);

        if (isEditMode && adjustmentToEdit) {
            editMutation.mutate({
                id: adjustmentToEdit.id,
                payload: {
                    quantity: adjustedQuantity,
                    type: values.type,
                    reason: values.reason || undefined
                }
            });
        } else {
            createMutation.mutate({
                ingredientId: values.ingredientId,
                quantity: adjustedQuantity,
                type: values.type,
                reason: values.reason || undefined
            });
        }
    };

    const isPending = createMutation.isPending || editMutation.isPending;
    const isLoading = !isRendering;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                <DialogHeader className="px-6 pt-6 pb-2">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        {isEditMode ? <Edit className="size-5 text-primary" /> : <Trash2 className="size-5 text-primary" />}
                        {isEditMode ? 'Edit Stock Adjustment' : 'Log Waste / Stock Adjustment'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {isEditMode
                            ? 'Update quantity, adjustment type, or notes. Live inventory levels will automatically recalculate.'
                            : 'Record waste, spoilage, theft, or manual correction events that reduce or adjust stock levels.'}
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
                                                <FormLabel className="font-semibold text-foreground/80">Raw Ingredient</FormLabel>
                                                <FormControl>
                                                    {isEditMode ? (
                                                        <Input
                                                            disabled
                                                            value={
                                                                selectedIngredient
                                                                    ? `${selectedIngredient.name}${
                                                                          selectedIngredient.defaultUnit
                                                                              ? ` (${selectedIngredient.defaultUnit.abbreviation || selectedIngredient.defaultUnit.name})`
                                                                              : ''
                                                                      }`
                                                                    : 'Selected Ingredient'
                                                            }
                                                            className="h-9 bg-muted/40 font-medium"
                                                        />
                                                    ) : (
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
                                                            onChange={(val, item) => {
                                                                field.onChange(val);
                                                                setSelectedIngredient(item || null);
                                                            }}
                                                            getOptionValue={(item) => item.id}
                                                            getOptionLabel={(item) => {
                                                                const unitStr = item.defaultUnit
                                                                    ? ` (${item.defaultUnit.abbreviation || item.defaultUnit.name})`
                                                                    : '';
                                                                return `${item.name}${unitStr}`;
                                                            }}
                                                            selectedItem={preselectedIngredient || undefined}
                                                            placeholder="Choose ingredient..."
                                                            searchPlaceholder="Search ingredients..."
                                                        />
                                                    )}
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
                                        render={({ field }) => {
                                            const unitAbbr = selectedIngredient?.defaultUnit?.abbreviation || selectedIngredient?.defaultUnit?.name;
                                            return (
                                                <FormItem>
                                                    <div className="flex items-center justify-between">
                                                        <FormLabel className="font-semibold text-foreground/80">
                                                            {isDiscrepancy ? 'Quantity Change' : 'Quantity'}
                                                        </FormLabel>
                                                        {unitAbbr && (
                                                            <span className="text-xs font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                                                Unit: {unitAbbr}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <FormControl>
                                                        <div className="relative flex items-center">
                                                            <Input
                                                                type="number"
                                                                step="any"
                                                                placeholder={isDiscrepancy ? 'e.g. -500' : 'e.g. 500'}
                                                                {...field}
                                                                onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                                                                className={`h-9 bg-background/50 ${unitAbbr ? 'pr-14' : ''}`}
                                                            />
                                                            {unitAbbr && (
                                                                <span className="absolute right-3 text-xs font-bold text-muted-foreground pointer-events-none uppercase">
                                                                    {unitAbbr}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </FormControl>
                                                    <p className="text-xs text-muted-foreground">
                                                        {isDiscrepancy
                                                            ? `Use negative values for reductions, positive for corrections${unitAbbr ? ` (in ${unitAbbr})` : ''}.`
                                                            : `Enter the quantity${unitAbbr ? ` in ${unitAbbr}` : ''} to deduct from stock.`}
                                                    </p>
                                                    <FormMessage />
                                                </FormItem>
                                            );
                                        }}
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
                            <Button type="submit" disabled={isPending || isLoading} className="h-9">
                                {isPending ? (
                                    <div className="flex items-center gap-1">
                                        <Spinner className="h-4 w-4" /> {isEditMode ? 'Saving...' : 'Logging...'}
                                    </div>
                                ) : isEditMode ? (
                                    'Save Changes'
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
